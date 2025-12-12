// Chat functionality for Hotline client

use super::HotlineClient;
use crate::protocol::constants::{FieldType, TransactionType};
use crate::protocol::transaction::{Transaction, TransactionField};
use tokio::io::AsyncWriteExt;

impl HotlineClient {
    pub async fn send_chat(&self, message: String) -> Result<(), String> {
        println!("Sending chat: {}", message);

        let mut transaction = Transaction::new(self.next_transaction_id(), TransactionType::SendChat);
        transaction.add_field(TransactionField::from_string(FieldType::Data, &message));
        transaction.add_field(TransactionField::from_u16(FieldType::ChatOptions, 0)); // 0 = normal chat, 1 = announce

        let encoded = transaction.encode();
        println!("Chat transaction: {} bytes", encoded.len());

        println!("Writing chat to stream...");
        let mut write_guard = self.write_half.lock().await;
        let write_stream = write_guard
            .as_mut()
            .ok_or("Not connected".to_string())?;

        write_stream
            .write_all(&encoded)
            .await
            .map_err(|e| {
                let err = format!("Failed to send chat: {}", e);
                eprintln!("{}", err);
                err
            })?;

        println!("Flushing stream...");
        // Flush the stream to ensure the message is sent immediately
        write_stream
            .flush()
            .await
            .map_err(|e| {
                let err = format!("Failed to flush stream: {}", e);
                eprintln!("{}", err);
                err
            })?;

        println!("Chat sent successfully");

        Ok(())
    }
}
