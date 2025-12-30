//! SOAP Client for Amadeus Enterprise NDC APIs
//!
//! This client handles XML serialization/deserialization and SOAP envelope
//! construction for NDC API calls.

use std::env;
use std::sync::OnceLock;
use tokio::sync::RwLock;
use std::time::Instant;

#[allow(unused_imports)]
use tracing::{info, warn, error, debug, instrument};

/// Amadeus Enterprise Base URL
const ENTERPRISE_TEST_URL: &str = "https://nodeD1.test.webservices.amadeus.com";
const ENTERPRISE_PROD_URL: &str = "https://production.webservices.amadeus.com";

/// SOAP Action headers for different NDC operations
pub mod soap_actions {
    pub const SECURITY_AUTHENTICATE: &str = "http://webservices.amadeus.com/VLSSLQ_06_1_1A";
    pub const AIR_MULTI_AVAILABILITY: &str = "http://webservices.amadeus.com/SATRQT_07_1_1A";
    pub const FARE_MASTER_PRICER: &str = "http://webservices.amadeus.com/FMPTBQ_24_2_1A";
    pub const FARE_PRICE_PNR_WITH_BOOKING_CLASS: &str = "http://webservices.amadeus.com/TPCBRQ_23_1_1A";
    pub const PNR_ADD_MULTI_ELEMENTS: &str = "http://webservices.amadeus.com/PNRADD_21_1_1A";
    pub const PNR_RETRIEVE: &str = "http://webservices.amadeus.com/PNRRET_21_1_1A";
    pub const TRAVEL_ORDER_CREATE: &str = "http://webservices.amadeus.com/TTORDR_17_1_1A";
    pub const TRAVEL_OFFER_PRICE: &str = "http://webservices.amadeus.com/TOFFPR_17_1_1A";
    pub const TRAVEL_SERVICE_LIST: &str = "http://webservices.amadeus.com/TSRVLT_17_1_1A";
    pub const TRAVEL_SEAT_AVAILABILITY: &str = "http://webservices.amadeus.com/TSEATV_17_1_1A";
    pub const TRAVEL_ORDER_PAY: &str = "http://webservices.amadeus.com/TORDPY_17_1_1A";
    pub const TRAVEL_ORDER_CANCEL: &str = "http://webservices.amadeus.com/TORDCL_17_1_1A";
    pub const TRAVEL_ORDER_RESHOP: &str = "http://webservices.amadeus.com/TORDRS_17_1_1A";
    pub const TRAVEL_ORDER_CHANGE: &str = "http://webservices.amadeus.com/TORDCH_17_1_1A";
}

/// Enterprise session token cache
#[allow(dead_code)]
struct EnterpriseSession {
    session_id: String,
    sequence_number: u32,
    security_token: String,
    expires_at: Instant,
}

#[allow(dead_code)]
static ENTERPRISE_SESSION: OnceLock<RwLock<Option<EnterpriseSession>>> = OnceLock::new();

#[allow(dead_code)]
fn get_session_cache() -> &'static RwLock<Option<EnterpriseSession>> {
    ENTERPRISE_SESSION.get_or_init(|| RwLock::new(None))
}

/// Get Enterprise base URL based on environment
pub fn get_enterprise_url() -> &'static str {
    match env::var("AMADEUS_ENV").as_deref() {
        Ok("production") => ENTERPRISE_PROD_URL,
        _ => ENTERPRISE_TEST_URL,
    }
}

/// SOAP Envelope wrapper
pub struct SoapEnvelope {
    pub session_id: Option<String>,
    pub sequence_number: Option<u32>,
    pub security_token: Option<String>,
    pub message_id: String,
    pub action: String,
    pub body: String,
}

impl SoapEnvelope {
    /// Create a new SOAP envelope without session (for authentication)
    pub fn new_stateless(action: &str, body: &str) -> Self {
        Self {
            session_id: None,
            sequence_number: None,
            security_token: None,
            message_id: uuid::Uuid::new_v4().to_string(),
            action: action.to_string(),
            body: body.to_string(),
        }
    }
    
    /// Create a SOAP envelope with session
    pub fn new_with_session(
        action: &str,
        body: &str,
        session_id: &str,
        sequence_number: u32,
        security_token: &str,
    ) -> Self {
        Self {
            session_id: Some(session_id.to_string()),
            sequence_number: Some(sequence_number),
            security_token: Some(security_token.to_string()),
            message_id: uuid::Uuid::new_v4().to_string(),
            action: action.to_string(),
            body: body.to_string(),
        }
    }
    
    /// Build the complete SOAP XML envelope
    pub fn to_xml(&self) -> String {
        let session_header = if let (Some(sid), Some(seq), Some(token)) = 
            (&self.session_id, self.sequence_number, &self.security_token) {
            format!(r#"
    <awsse:Session TransactionStatusCode="InSeries">
      <awsse:SessionId>{}</awsse:SessionId>
      <awsse:SequenceNumber>{}</awsse:SequenceNumber>
      <awsse:SecurityToken>{}</awsse:SecurityToken>
    </awsse:Session>"#, sid, seq, token)
        } else {
            String::new()
        };

        format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:awsse="http://xml.amadeus.com/2010/06/Session_v3">
  <soap:Header>
    <awsse:AMA_SecurityHostedUser>
      <awsse:UserID AgentDutyCode="SU" PseudoCityCode=""/>
    </awsse:AMA_SecurityHostedUser>{}
  </soap:Header>
  <soap:Body>
    {}
  </soap:Body>
</soap:Envelope>"#, session_header, self.body)
    }
}

