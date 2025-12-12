// File management functionality for Hotline client

use super::{FileInfo, HotlineClient};
use crate::protocol::constants::{FieldType, TransactionType, FILE_TRANSFER_ID};
use crate::protocol::transaction::{Transaction, TransactionField};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::mpsc;

impl HotlineClient {
    pub async fn get_file_list(&self, path: Vec<String>) -> Result<(), String> {
        println!("Requesting file list for path: {:?}", path);

        let transaction_id = self.next_transaction_id();
        let mut transaction = Transaction::new(transaction_id, TransactionType::GetFileNameList);
        
        // Store the path for this transaction
        {
            let mut paths = self.file_list_paths.write().await;
            paths.insert(transaction_id, path.clone());
        }

        // Encode path as FilePath field
        // FilePath format: 2 bytes item count + for each item: 2 bytes (0x0000) + 1 byte name length + name
        if !path.is_empty() {
            let mut path_data = Vec::new();
            path_data.extend_from_slice(&(path.len() as u16).to_be_bytes());

            for folder in &path {
                let folder_bytes = folder.as_bytes();
                // Add separator bytes (0x0000)
                path_data.extend_from_slice(&[0x00, 0x00]);
                // Add name length as single byte
                path_data.push(folder_bytes.len() as u8);
                // Add name
                path_data.extend_from_slice(folder_bytes);
            }

            println!("Path data encoded ({} bytes): {:02X?}", path_data.len(), path_data);

            transaction.add_field(TransactionField {
                field_type: FieldType::FilePath,
                data: path_data,
            });
        }

        let encoded = transaction.encode();

        println!("Sending GetFileNameList transaction...");
        let mut write_guard = self.write_half.lock().await;
        let write_stream = write_guard
            .as_mut()
            .ok_or("Not connected".to_string())?;

        write_stream
            .write_all(&encoded)
            .await
            .map_err(|e| format!("Failed to send GetFileNameList: {}", e))?;

        write_stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush stream: {}", e))?;

        println!("GetFileNameList request sent");

        Ok(())
    }

    pub async fn download_file(&self, path: Vec<String>, file_name: String) -> Result<u32, String> {
        println!("Requesting download for file: {:?} / {}", path, file_name);

        let mut transaction = Transaction::new(self.next_transaction_id(), TransactionType::DownloadFile);

        // Add FileName field
        transaction.add_field(TransactionField::from_string(FieldType::FileName, &file_name));

        // Add FilePath field if not at root
        if !path.is_empty() {
            let mut path_data = Vec::new();
            path_data.extend_from_slice(&(path.len() as u16).to_be_bytes());

            for folder in &path {
                let folder_bytes = folder.as_bytes();
                path_data.extend_from_slice(&[0x00, 0x00]);
                path_data.push(folder_bytes.len() as u8);
                path_data.extend_from_slice(folder_bytes);
            }

            transaction.add_field(TransactionField {
                field_type: FieldType::FilePath,
                data: path_data,
            });
        }

        let encoded = transaction.encode();
        let transaction_id = transaction.id;

        // Create channel to receive reply
        let (tx, mut rx) = mpsc::channel(1);
        {
            let mut pending = self.pending_transactions.write().await;
            pending.insert(transaction_id, tx);
        }

        // Send transaction
        println!("Sending DownloadFile transaction...");
        let mut write_guard = self.write_half.lock().await;
        let write_stream = write_guard
            .as_mut()
            .ok_or("Not connected".to_string())?;

        write_stream
            .write_all(&encoded)
            .await
            .map_err(|e| format!("Failed to send DownloadFile: {}", e))?;

        write_stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush stream: {}", e))?;

        drop(write_guard);

        // Wait for reply
        println!("Waiting for DownloadFile reply...");
        let reply = tokio::time::timeout(Duration::from_secs(10), rx.recv())
            .await
            .map_err(|_| "Timeout waiting for download reply".to_string())?
            .ok_or("Channel closed".to_string())?;

        println!("DownloadFile reply received: error_code={}, {} fields", reply.error_code, reply.fields.len());

        // Print all fields for debugging
        for (i, field) in reply.fields.iter().enumerate() {
            println!("  Field {}: type={:?}, size={} bytes, data={:02X?}",
                i, field.field_type, field.data.len(),
                &field.data[..std::cmp::min(20, field.data.len())]);
        }

        if reply.error_code != 0 {
            let error_msg = reply
                .get_field(FieldType::ErrorText)
                .and_then(|f| f.to_string().ok())
                .unwrap_or_else(|| format!("Error code: {}", reply.error_code));
            return Err(format!("Download failed: {}", error_msg));
        }

        // Get reference number from reply
        let reference_number = reply
            .get_field(FieldType::ReferenceNumber)
            .and_then(|f| f.to_u32().ok())
            .ok_or("No reference number in reply".to_string())?;

        println!("Download reference number: {}", reference_number);

        // Get transfer size if available
        let transfer_size = reply.get_field(FieldType::TransferSize)
            .and_then(|f| f.to_u32().ok());

        if let Some(size) = transfer_size {
            println!("Transfer size from server: {} bytes", size);
        }

        // Get file size if available
        let file_size = reply.get_field(FieldType::FileSize)
            .and_then(|f| f.to_u32().ok());

        if let Some(size) = file_size {
            println!("File size from server: {} bytes", size);
        }

        // Check for file transfer options
        if let Some(options_field) = reply.get_field(FieldType::FileTransferOptions) {
            println!("File transfer options: {:02X?}", options_field.data);
        }

        Ok(reference_number)
    }

    pub async fn perform_file_transfer<F>(&self, reference_number: u32, expected_size: u32, mut progress_callback: F) -> Result<Vec<u8>, String>
    where
        F: FnMut(u32, u32) + Send,
    {
        println!("Starting file transfer with reference number: {}", reference_number);

        // Open a new TCP connection to the server for file transfer
        // File transfers use port+1 (e.g., 5501 for main port 5500)
        let transfer_port = self.bookmark.port + 1;
        let addr = format!("{}:{}", self.bookmark.address, transfer_port);
        println!("Connecting to file transfer port: {}", transfer_port);

        let mut transfer_stream = TcpStream::connect(&addr)
            .await
            .map_err(|e| format!("Failed to connect for file transfer: {}", e))?;

        println!("File transfer connection established");

        // Send file transfer handshake
        // Format: HTXF (4) + reference_number (4) + 0 (4) + 0 (4) = 16 bytes
        let mut handshake = Vec::with_capacity(16);
        handshake.extend_from_slice(FILE_TRANSFER_ID); // "HTXF"
        handshake.extend_from_slice(&reference_number.to_be_bytes());
        handshake.extend_from_slice(&0u32.to_be_bytes());
        handshake.extend_from_slice(&0u32.to_be_bytes());

        println!("Sending file transfer handshake ({} bytes): {:02X?}", handshake.len(), &handshake);
        transfer_stream
            .write_all(&handshake)
            .await
            .map_err(|e| format!("Failed to send file transfer handshake: {}", e))?;

        transfer_stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush handshake: {}", e))?;

        println!("File transfer handshake sent, waiting for response...");

        // Try to read any response from server first
        let mut peek_buffer = [0u8; 4];
        println!("Attempting to peek at server response...");
        let bytes_read = match tokio::time::timeout(
            Duration::from_secs(5),
            transfer_stream.read(&mut peek_buffer)
        ).await {
            Ok(Ok(n)) => {
                println!("Server sent {} bytes: {:02X?}", n, &peek_buffer[..n]);
                n
            }
            Ok(Err(e)) => {
                return Err(format!("Error reading from server: {}", e));
            }
            Err(_) => {
                return Err("Timeout waiting for server response - server sent nothing".to_string());
            }
        };

        if bytes_read == 0 {
            return Err("Server closed connection immediately after handshake".to_string());
        }

        // Read rest of header (total 24 bytes for FILP header)
        // Format: FILP (4) + version (2) + reserved (16) + fork count (2)
        let mut response_header = [0u8; 24];
        response_header[..bytes_read].copy_from_slice(&peek_buffer[..bytes_read]);

        if bytes_read < 24 {
            transfer_stream
                .read_exact(&mut response_header[bytes_read..])
                .await
                .map_err(|e| format!("Failed to read rest of file transfer header: {}", e))?;
        }

        println!("File transfer header received (24 bytes): {:02X?}", &response_header);

        // The header should start with "FILP"
        if &response_header[0..4] != b"FILP" {
            return Err(format!(
                "Invalid file transfer header: expected FILP, got {:?}",
                String::from_utf8_lossy(&response_header[0..4])
            ));
        }

        let version = u16::from_be_bytes([response_header[4], response_header[5]]);
        println!("FILP version: {}", version);

        // Read fork count from bytes 22-23 (after 4 + 2 + 16 bytes)
        let fork_count = u16::from_be_bytes([response_header[22], response_header[23]]);
        println!("File has {} fork(s)", fork_count);

        // Read each fork header and data
        let mut file_data = Vec::new();

        for fork_idx in 0..fork_count {
            // Fork header format:
            // Fork type (4 bytes) - "DATA" or "MACR" (resource fork) or "INFO"
            // Compression type (4 bytes)
            // Reserved (4 bytes)
            // Data size (4 bytes)
            let mut fork_header = [0u8; 16];
            transfer_stream
                .read_exact(&mut fork_header)
                .await
                .map_err(|e| format!("Failed to read fork {} header: {}", fork_idx, e))?;

            println!("Fork {} header bytes: {:02X?}", fork_idx, &fork_header);

            let fork_type = String::from_utf8_lossy(&fork_header[0..4]).to_string();
            let compression = u32::from_be_bytes([fork_header[4], fork_header[5], fork_header[6], fork_header[7]]);
            let data_size = u32::from_be_bytes([fork_header[12], fork_header[13], fork_header[14], fork_header[15]]);

            println!("Fork {}: type='{}', compression={}, size={} bytes", fork_idx, fork_type.trim(), compression, data_size);

            // Determine actual size to read
            // If fork header shows 0 size but this is a DATA fork, use expected_size
            let actual_size = if data_size == 0 && fork_type.trim() == "DATA" && expected_size > 0 {
                println!("Fork header shows 0 size, using expected size from file list: {} bytes", expected_size);
                expected_size
            } else {
                if fork_type.trim() == "DATA" && data_size != expected_size && expected_size > 0 {
                    println!("Note: DATA fork header size ({}) differs from file list size ({})", data_size, expected_size);
                }
                data_size
            };

            // Read fork data
            if actual_size > 0 {
                let is_data_fork = fork_type.trim() == "DATA";

                if is_data_fork {
                    // For DATA fork, read in chunks and report progress
                    let chunk_size = 65536; // 64KB chunks
                    let mut fork_data = Vec::with_capacity(actual_size as usize);
                    let mut bytes_read = 0u32;
                    let mut last_reported_progress = 0u32;

                    while bytes_read < actual_size {
                        let remaining = actual_size - bytes_read;
                        let to_read = std::cmp::min(remaining, chunk_size) as usize;
                        let mut chunk = vec![0u8; to_read];

                        transfer_stream
                            .read_exact(&mut chunk)
                            .await
                            .map_err(|e| format!("Failed to read fork {} data: {}", fork_idx, e))?;

                        bytes_read += to_read as u32;
                        fork_data.extend_from_slice(&chunk);

                        // Only emit progress every 2% or on completion to avoid UI stuttering
                        let current_progress = (bytes_read as f64 / actual_size as f64 * 100.0) as u32;
                        if current_progress >= last_reported_progress + 2 || bytes_read == actual_size {
                            progress_callback(bytes_read, actual_size);
                            last_reported_progress = current_progress;
                        }
                    }

                    println!("Received DATA fork: {} bytes", fork_data.len());
                    file_data = fork_data;
                } else {
                    // For INFO/MACR forks, read all at once
                    let mut fork_data = vec![0u8; actual_size as usize];
                    transfer_stream
                        .read_exact(&mut fork_data)
                        .await
                        .map_err(|e| format!("Failed to read fork {} data: {}", fork_idx, e))?;

                    if fork_type.trim() == "INFO" {
                        println!("Skipped INFO fork: {} bytes", fork_data.len());
                    } else if fork_type.trim() == "MACR" {
                        println!("Skipped MACR (resource) fork: {} bytes", fork_data.len());
                    }
                }
            }
        }

        println!("File transfer complete: {} bytes received", file_data.len());

        Ok(file_data)
    }

    pub(crate) fn parse_file_info(data: &[u8]) -> Result<FileInfo, String> {
        // FileNameWithInfo format:
        // 4 bytes: File type (4-char code)
        // 4 bytes: Creator (4-char code)
        // 4 bytes: File size
        // 4 bytes: Unknown/reserved
        // 2 bytes: Unknown/flags
        // 2 bytes: Name length
        // N bytes: File name

        if data.len() < 20 {
            return Err(format!("FileNameWithInfo data too short: {} bytes", data.len()));
        }

        let file_type = String::from_utf8_lossy(&data[0..4]).to_string();
        let creator = String::from_utf8_lossy(&data[4..8]).to_string();
        let size = u32::from_be_bytes([data[8], data[9], data[10], data[11]]);
        // Skip bytes 12-15 (unknown/reserved)
        // Skip bytes 16-17 (unknown/flags)
        let name_len = u16::from_be_bytes([data[18], data[19]]) as usize;

        if data.len() < 20 + name_len {
            return Err(format!("FileNameWithInfo name data too short: have {} bytes, need {}", data.len(), 20 + name_len));
        }

        let name = String::from_utf8_lossy(&data[20..20 + name_len]).to_string();

        // Folders have file type "fldr"
        let is_folder = file_type.trim() == "fldr";

        Ok(FileInfo {
            name,
            size,
            is_folder,
            file_type,
            creator,
        })
    }

    pub async fn download_banner(&self) -> Result<(u32, u32), String> {
        println!("Requesting banner download...");

        let transaction = Transaction::new(self.next_transaction_id(), TransactionType::DownloadBanner);
        let encoded = transaction.encode();
        let transaction_id = transaction.id;

        // Create channel to receive reply
        let (tx, mut rx) = mpsc::channel(1);
        {
            let mut pending = self.pending_transactions.write().await;
            pending.insert(transaction_id, tx);
        }

        // Send transaction
        println!("Sending DownloadBanner transaction...");
        let mut write_guard = self.write_half.lock().await;
        let write_stream = write_guard
            .as_mut()
            .ok_or("Not connected".to_string())?;

        write_stream
            .write_all(&encoded)
            .await
            .map_err(|e| format!("Failed to send DownloadBanner: {}", e))?;

        write_stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush: {}", e))?;

        drop(write_guard);

        // Wait for reply
        println!("Waiting for DownloadBanner reply...");
        let reply = tokio::time::timeout(Duration::from_secs(10), rx.recv())
            .await
            .map_err(|_| "Timeout waiting for banner reply".to_string())?
            .ok_or("Channel closed".to_string())?;

        println!("DownloadBanner reply received: error_code={}", reply.error_code);

        if reply.error_code != 0 {
            let error_msg = reply
                .get_field(FieldType::ErrorText)
                .and_then(|f| f.to_string().ok())
                .unwrap_or_else(|| format!("Error code: {}", reply.error_code));
            return Err(format!("Banner download failed: {}", error_msg));
        }

        // Get reference number and transfer size from reply
        let reference_number = reply
            .get_field(FieldType::ReferenceNumber)
            .and_then(|f| f.to_u32().ok())
            .ok_or("No reference number in reply".to_string())?;

        let transfer_size = reply
            .get_field(FieldType::TransferSize)
            .and_then(|f| f.to_u32().ok())
            .ok_or("No transfer size in reply".to_string())?;

        println!("Banner reference number: {}, transfer size: {} bytes", reference_number, transfer_size);

        Ok((reference_number, transfer_size))
    }

    /// Download banner as raw image data (not FILP format)
    /// Banners are sent as raw image data after the HTXF handshake
    pub async fn download_banner_raw(&self, reference_number: u32, transfer_size: u32) -> Result<Vec<u8>, String> {
        println!("Starting banner download (raw data) with reference: {}, size: {} bytes", reference_number, transfer_size);

        // Open a new TCP connection to the server for file transfer
        let transfer_port = self.bookmark.port + 1;
        let addr = format!("{}:{}", self.bookmark.address, transfer_port);
        println!("Connecting to file transfer port: {}", transfer_port);

        let mut transfer_stream = TcpStream::connect(&addr)
            .await
            .map_err(|e| format!("Failed to connect for banner transfer: {}", e))?;

        println!("Banner transfer connection established");

        // Send file transfer handshake (same as regular file transfer)
        let mut handshake = Vec::with_capacity(16);
        handshake.extend_from_slice(FILE_TRANSFER_ID); // "HTXF"
        handshake.extend_from_slice(&reference_number.to_be_bytes());
        handshake.extend_from_slice(&0u32.to_be_bytes());
        handshake.extend_from_slice(&0u32.to_be_bytes());

        println!("Sending banner transfer handshake ({} bytes): {:02X?}", handshake.len(), &handshake);
        transfer_stream
            .write_all(&handshake)
            .await
            .map_err(|e| format!("Failed to send banner handshake: {}", e))?;

        transfer_stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush handshake: {}", e))?;

        println!("Banner handshake sent, reading raw image data...");

        // Read raw data directly (no FILP header for banners)
        // The server sends the image data immediately after the handshake
        let chunk_size = 65536; // 64KB chunks
        let mut banner_data = Vec::with_capacity(transfer_size as usize);
        let mut bytes_read = 0u32;

        while bytes_read < transfer_size {
            let remaining = transfer_size - bytes_read;
            let to_read = std::cmp::min(remaining, chunk_size) as usize;
            let mut chunk = vec![0u8; to_read];

            transfer_stream
                .read_exact(&mut chunk)
                .await
                .map_err(|e| format!("Failed to read banner data: {}", e))?;

            bytes_read += to_read as u32;
            banner_data.extend_from_slice(&chunk);
        }

        println!("Banner download complete: {} bytes received", banner_data.len());

        Ok(banner_data)
    }

    /// Upload a file to the server
    /// - path: Directory path where the file should be uploaded
    /// - file_name: Name of the file to upload
    /// - file_data: The file contents to upload
    /// - progress_callback: Callback for progress updates (bytes_sent, total_bytes)
    pub async fn upload_file<F>(
        &self,
        path: Vec<String>,
        file_name: String,
        file_data: Vec<u8>,
        mut progress_callback: F,
    ) -> Result<(), String>
    where
        F: FnMut(u32, u32),
    {
        println!("Requesting file upload: {} to path {:?}", file_name, path);

        let transaction_id = self.next_transaction_id();
        let mut transaction = Transaction::new(transaction_id, TransactionType::UploadFile);

        // Add file name field
        transaction.add_field(TransactionField {
            field_type: FieldType::FileName,
            data: file_name.as_bytes().to_vec(),
        });

        // Add file path field if not root
        if !path.is_empty() {
            let mut path_data = Vec::new();
            path_data.extend_from_slice(&(path.len() as u16).to_be_bytes());

            for folder in &path {
                path_data.extend_from_slice(&[0x00, 0x00]); // Separator
                path_data.push(folder.as_bytes().len() as u8); // Name length
                path_data.extend_from_slice(folder.as_bytes()); // Name
            }

            transaction.add_field(TransactionField {
                field_type: FieldType::FilePath,
                data: path_data,
            });
        }

        let encoded = transaction.encode();

        // Create channel to receive reply
        let (tx, mut rx) = mpsc::channel(1);
        {
            let mut pending = self.pending_transactions.write().await;
            pending.insert(transaction_id, tx);
        }

        // Send transaction
        println!("Sending UploadFile transaction...");
        let mut write_guard = self.write_half.lock().await;
        let write_stream = write_guard
            .as_mut()
            .ok_or("Not connected".to_string())?;

        write_stream
            .write_all(&encoded)
            .await
            .map_err(|e| format!("Failed to send UploadFile: {}", e))?;

        write_stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush: {}", e))?;

        drop(write_guard);

        // Wait for reply
        println!("Waiting for UploadFile reply...");
        let reply = tokio::time::timeout(Duration::from_secs(10), rx.recv())
            .await
            .map_err(|_| "Timeout waiting for upload reply".to_string())?
            .ok_or("Channel closed".to_string())?;

        println!("UploadFile reply received: error_code={}", reply.error_code);

        if reply.error_code != 0 {
            let error_msg = reply
                .get_field(FieldType::ErrorText)
                .and_then(|f| f.to_string().ok())
                .unwrap_or_else(|| format!("Error code: {}", reply.error_code));
            return Err(format!("Upload failed: {}", error_msg));
        }

        // Get reference number from reply
        let reference_number = reply
            .get_field(FieldType::ReferenceNumber)
            .and_then(|f| f.to_u32().ok())
            .ok_or("No reference number in reply".to_string())?;

        println!("Upload reference number: {}", reference_number);

        // Perform the actual file transfer
        self.perform_file_upload(reference_number, &file_name, &file_data, &mut progress_callback)
            .await?;

        Ok(())
    }

    /// Perform the actual file upload transfer
    async fn perform_file_upload<F>(
        &self,
        reference_number: u32,
        file_name: &str,
        file_data: &[u8],
        progress_callback: &mut F,
    ) -> Result<(), String>
    where
        F: FnMut(u32, u32),
    {
        println!("Starting file upload transfer: {} ({} bytes)", file_name, file_data.len());

        // Open a new TCP connection to the server for file transfer
        let transfer_port = self.bookmark.port + 1;
        let addr = format!("{}:{}", self.bookmark.address, transfer_port);
        println!("Connecting to file transfer port: {}", transfer_port);

        let mut transfer_stream = TcpStream::connect(&addr)
            .await
            .map_err(|e| format!("Failed to connect for upload transfer: {}", e))?;

        println!("Upload transfer connection established");

        // Calculate total transfer size
        // FILP header (24) + INFO fork header (16) + INFO fork data (minimal) + DATA fork header (16) + DATA fork data
        let info_fork_size = 0u32; // Minimal INFO fork for now
        let data_fork_size = file_data.len() as u32;
        let total_size = 24 + 16 + info_fork_size + 16 + data_fork_size;

        // Send file transfer handshake
        // Format: HTXF (4) + reference_number (4) + total_size (4) + 0 (4) = 16 bytes
        let mut handshake = Vec::with_capacity(16);
        handshake.extend_from_slice(FILE_TRANSFER_ID); // "HTXF"
        handshake.extend_from_slice(&reference_number.to_be_bytes());
        handshake.extend_from_slice(&total_size.to_be_bytes());
        handshake.extend_from_slice(&0u32.to_be_bytes());

        println!("Sending upload handshake ({} bytes): {:02X?}", handshake.len(), &handshake);
        transfer_stream
            .write_all(&handshake)
            .await
            .map_err(|e| format!("Failed to send upload handshake: {}", e))?;

        transfer_stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush handshake: {}", e))?;

        println!("Upload handshake sent");

        // Send FILP header
        // Format: FILP (4) + version (2) + reserved (16) + fork count (2) = 24 bytes
        let mut filp_header = Vec::with_capacity(24);
        filp_header.extend_from_slice(b"FILP"); // Format
        filp_header.extend_from_slice(&1u16.to_be_bytes()); // Version
        filp_header.extend_from_slice(&[0u8; 16]); // Reserved
        filp_header.extend_from_slice(&2u16.to_be_bytes()); // Fork count (INFO + DATA)

        transfer_stream
            .write_all(&filp_header)
            .await
            .map_err(|e| format!("Failed to send FILP header: {}", e))?;

        // Send INFO fork header
        // Format: Fork type (4) + compression (4) + reserved (4) + data size (4) = 16 bytes
        let mut info_fork_header = Vec::with_capacity(16);
        info_fork_header.extend_from_slice(b"INFO"); // Fork type
        info_fork_header.extend_from_slice(&0u32.to_be_bytes()); // Compression
        info_fork_header.extend_from_slice(&0u32.to_be_bytes()); // Reserved
        info_fork_header.extend_from_slice(&info_fork_size.to_be_bytes()); // Data size

        transfer_stream
            .write_all(&info_fork_header)
            .await
            .map_err(|e| format!("Failed to send INFO fork header: {}", e))?;

        // INFO fork data is empty for now
        // (In a full implementation, this would contain file metadata)

        // Send DATA fork header
        let mut data_fork_header = Vec::with_capacity(16);
        data_fork_header.extend_from_slice(b"DATA"); // Fork type
        data_fork_header.extend_from_slice(&0u32.to_be_bytes()); // Compression
        data_fork_header.extend_from_slice(&0u32.to_be_bytes()); // Reserved
        data_fork_header.extend_from_slice(&data_fork_size.to_be_bytes()); // Data size

        transfer_stream
            .write_all(&data_fork_header)
            .await
            .map_err(|e| format!("Failed to send DATA fork header: {}", e))?;

        // Send DATA fork (the actual file data) in chunks with progress tracking
        let chunk_size = 65536; // 64KB chunks
        let mut bytes_sent = 0u32;
        let mut last_reported_progress = 0u32;

        while bytes_sent < data_fork_size {
            let remaining = data_fork_size - bytes_sent;
            let to_send = std::cmp::min(remaining, chunk_size) as usize;
            let chunk = &file_data[bytes_sent as usize..(bytes_sent as usize + to_send)];

            transfer_stream
                .write_all(chunk)
                .await
                .map_err(|e| format!("Failed to send file data: {}", e))?;

            bytes_sent += to_send as u32;

            // Report progress every 2% or on completion
            let current_progress = (bytes_sent as f64 / data_fork_size as f64 * 100.0) as u32;
            if current_progress >= last_reported_progress + 2 || bytes_sent == data_fork_size {
                progress_callback(bytes_sent, data_fork_size);
                last_reported_progress = current_progress;
            }
        }

        transfer_stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush file data: {}", e))?;

        println!("File upload complete: {} bytes sent", bytes_sent);

        Ok(())
    }
}
