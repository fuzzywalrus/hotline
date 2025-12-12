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

    pub async fn send_private_message(&self, user_id: u16, message: String) -> Result<(), String> {
        println!("Sending private message to user {}: {}", user_id, message);

        let mut transaction = Transaction::new(self.next_transaction_id(), TransactionType::SendInstantMessage);
        transaction.add_field(TransactionField::from_u16(FieldType::UserId, user_id));
        transaction.add_field(TransactionField::from_u32(FieldType::Options, 1)); // Options = 1 for instant messages
        transaction.add_field(TransactionField::from_string(FieldType::Data, &message));

        let encoded = transaction.encode();

        let mut write_guard = self.write_half.lock().await;
        let write_stream = write_guard
            .as_mut()
            .ok_or("Not connected".to_string())?;

        write_stream
            .write_all(&encoded)
            .await
            .map_err(|e| format!("Failed to send private message: {}", e))?;

        write_stream
            .flush()
            .await
            .map_err(|e| format!("Failed to flush: {}", e))?;

        println!("Private message sent successfully");

        Ok(())
    }
}
