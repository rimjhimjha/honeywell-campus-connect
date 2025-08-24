"""
Configuration management for SafeZoneAI Backend
"""

import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Twilio Configuration
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    
    # SendGrid Configuration
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "alerts@safezoneai.com"
    
    # Alert Recipients
    alert_phone_numbers: str = ""
    alert_email_addresses: str = ""
    
    # Detection Configuration
    crowd_threshold: int = 10
    confidence_threshold: float = 0.6
    alert_cooldown_seconds: int = 30
    
    # Database
    database_url: str = "sqlite:///safezone.db"
    
    class Config:
        env_file = ".env"
    
    @property
    def phone_numbers_list(self) -> List[str]:
        """Get list of phone numbers for alerts"""
        if not self.alert_phone_numbers:
            return []
        return [num.strip() for num in self.alert_phone_numbers.split(",")]
    
    @property
    def email_addresses_list(self) -> List[str]:
        """Get list of email addresses for alerts"""
        if not self.alert_email_addresses:
            return []
        return [email.strip() for email in self.alert_email_addresses.split(",")]

# Global settings instance
settings = Settings()