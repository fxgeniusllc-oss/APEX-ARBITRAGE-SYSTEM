#!/usr/bin/env python3
"""
Telegram Notification Service for APEX Arbitrage System
Sends status updates and alerts via Telegram bot
"""

import os
import sys
import json
from datetime import datetime

def send_telegram_notification(message):
    """Send notification via Telegram"""
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    
    if not bot_token or not chat_id:
        print("ℹ️  Telegram credentials not configured, skipping notification")
        print(f"   Message would have been: {message}")
        return True
    
    try:
        import requests
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        
        payload = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ Telegram notification sent successfully")
            return True
        else:
            print(f"⚠️  Telegram notification failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except ImportError:
        print("ℹ️  'requests' library not installed, skipping notification")
        print(f"   Message would have been: {message}")
        return True
    except Exception as e:
        print(f"⚠️  Error sending Telegram notification: {e}")
        print(f"   Message would have been: {message}")
        return True  # Don't fail the workflow

def format_message(message):
    """Format message with timestamp and emoji"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
    
    formatted = f"""
🤖 <b>APEX Quantum Agent</b>

{message}

⏰ {timestamp}
"""
    
    return formatted

def main():
    """Main notification function"""
    if len(sys.argv) < 2:
        print("Usage: notify_telegram.py <message>")
        return 1
    
    # Get message from command line argument
    message = ' '.join(sys.argv[1:])
    
    # Format and send
    formatted_message = format_message(message)
    
    success = send_telegram_notification(formatted_message)
    
    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())
