"""
Alert management system for SafeZoneAI

Handles SMS and email notifications via Twilio and SendGrid
"""

import logging
from typing import List, Optional
from datetime import datetime
from twilio.rest import Client as TwilioClient
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from .config import settings

logger = logging.getLogger(__name__)

class AlertManager:
    """
    Manages alert notifications via SMS and Email
    """
    
    def __init__(self):
        """Initialize alert services"""
        self.twilio_client = None
        self.sendgrid_client = None
        
        # Initialize Twilio
        if settings.twilio_account_sid and settings.twilio_auth_token:
            try:
                self.twilio_client = TwilioClient(
                    settings.twilio_account_sid,
                    settings.twilio_auth_token
                )
                logger.info("Twilio client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio: {e}")
        
        # Initialize SendGrid
        if settings.sendgrid_api_key:
            try:
                self.sendgrid_client = SendGridAPIClient(api_key=settings.sendgrid_api_key)
                logger.info("SendGrid client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize SendGrid: {e}")
    
    async def send_sms_alert(self, 
                           message: str, 
                           phone_numbers: Optional[List[str]] = None) -> bool:
        """
        Send SMS alert to specified numbers
        
        Args:
            message: Alert message to send
            phone_numbers: List of phone numbers (uses config if None)
            
        Returns:
            True if at least one SMS was sent successfully
        """
        if not self.twilio_client:
            logger.warning("Twilio not configured, skipping SMS")
            return False
        
        if not phone_numbers:
            phone_numbers = settings.phone_numbers_list
        
        if not phone_numbers:
            logger.warning("No phone numbers configured")
            return False
        
        success_count = 0
        
        for phone_number in phone_numbers:
            try:
                message_obj = self.twilio_client.messages.create(
                    body=message,
                    from_=settings.twilio_phone_number,
                    to=phone_number
                )
                logger.info(f"SMS sent to {phone_number}: {message_obj.sid}")
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to send SMS to {phone_number}: {e}")
        
        return success_count > 0
    
    async def send_email_alert(self, 
                             subject: str,
                             message: str,
                             email_addresses: Optional[List[str]] = None) -> bool:
        """
        Send email alert to specified addresses
        
        Args:
            subject: Email subject
            message: Alert message
            email_addresses: List of email addresses (uses config if None)
            
        Returns:
            True if at least one email was sent successfully
        """
        if not self.sendgrid_client:
            logger.warning("SendGrid not configured, skipping email")
            return False
        
        if not email_addresses:
            email_addresses = settings.email_addresses_list
        
        if not email_addresses:
            logger.warning("No email addresses configured")
            return False
        
        success_count = 0
        
        for email_address in email_addresses:
            try:
                mail = Mail(
                    from_email=settings.sendgrid_from_email,
                    to_emails=email_address,
                    subject=subject,
                    html_content=f"""
                    <html>
                    <body>
                        <h2>SafeZoneAI Security Alert</h2>
                        <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                        <p><strong>Message:</strong></p>
                        <p>{message}</p>
                        <hr>
                        <p><em>This is an automated alert from SafeZoneAI Public Space Safety Monitor</em></p>
                    </body>
                    </html>
                    """
                )
                
                response = self.sendgrid_client.send(mail)
                logger.info(f"Email sent to {email_address}: {response.status_code}")
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to send email to {email_address}: {e}")
        
        return success_count > 0
    
    async def send_alert(self, 
                        event_type: str,
                        description: str,
                        confidence: float,
                        location: str = "Unknown") -> dict:
        """
        Send comprehensive alert via SMS and Email
        
        Args:
            event_type: Type of safety event
            description: Event description
            confidence: Detection confidence
            location: Event location
            
        Returns:
            Dictionary with send results
        """
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Format messages
        sms_message = (
            f"🚨 SAFETY ALERT 🚨\n"
            f"Event: {event_type.upper()}\n"
            f"Location: {location}\n"
            f"Time: {timestamp}\n"
            f"Details: {description}\n"
            f"Confidence: {confidence:.0%}"
        )
        
        email_subject = f"🚨 SafeZoneAI Alert: {event_type.title()} Detected"
        email_message = (
            f"<strong>Safety Event Detected</strong><br><br>"
            f"<strong>Event Type:</strong> {event_type.title()}<br>"
            f"<strong>Location:</strong> {location}<br>"
            f"<strong>Timestamp:</strong> {timestamp}<br>"
            f"<strong>Confidence:</strong> {confidence:.0%}<br>"
            f"<strong>Description:</strong> {description}<br><br>"
            f"Please investigate immediately and take appropriate action."
        )
        
        # Send alerts
        sms_sent = await self.send_sms_alert(sms_message)
        email_sent = await self.send_email_alert(email_subject, email_message)
        
        result = {
            "sms_sent": sms_sent,
            "email_sent": email_sent,
            "timestamp": timestamp
        }
        
        logger.info(f"Alert sent for {event_type}: SMS={sms_sent}, Email={email_sent}")
        return result

# Global alert manager instance
alert_manager = AlertManager()