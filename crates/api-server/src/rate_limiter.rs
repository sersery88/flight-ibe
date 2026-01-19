//! Rate Limiter for API calls
//!
//! Enforces a maximum number of transactions per second (TPS) to respect
//! Amadeus API rate limits.

use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::{Instant, sleep};

/// Rate limiter that enforces a maximum TPS (transactions per second)
#[derive(Clone)]
pub struct RateLimiter {
    /// Last request time
    last_request: Arc<Mutex<Option<Instant>>>,
    /// Interval between requests in milliseconds
    interval_ms: u64,
}

impl RateLimiter {
    /// Create a new rate limiter with the specified TPS
    ///
    /// # Arguments
    /// * `tps` - Maximum transactions per second (e.g., 10 for Amadeus test environment)
    pub fn new(tps: u32) -> Self {
        let interval_ms = 1000 / tps as u64;
        Self {
            last_request: Arc::new(Mutex::new(None)),
            interval_ms,
        }
    }

    /// Wait for the rate limit interval
    ///
    /// This method ensures requests are spaced out by the configured interval
    pub async fn wait(&self) {
        let mut last = self.last_request.lock().await;

        if let Some(last_time) = *last {
            let elapsed = last_time.elapsed();
            let required = Duration::from_millis(self.interval_ms);

            if elapsed < required {
                sleep(required - elapsed).await;
            }
        }

        *last = Some(Instant::now());
    }

    /// Get the interval in milliseconds
    #[allow(dead_code)]
    pub fn interval_ms(&self) -> u64 {
        self.interval_ms
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::Instant;

    #[tokio::test]
    async fn test_rate_limiter() {
        let limiter = RateLimiter::new(10); // 10 TPS = 100ms interval

        let start = Instant::now();

        // Make 10 requests
        for _ in 0..10 {
            limiter.wait().await;
        }

        let elapsed = start.elapsed();

        // Should take approximately 1000ms (10 requests at 100ms each)
        assert!(elapsed.as_millis() >= 950);
        assert!(elapsed.as_millis() <= 1100); // Allow some tolerance
    }
}
