import os
import time
import asyncio
import logging
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CleanupService")

# Configuration
CLEANUP_INTERVAL_SECONDS = 1800  # 30 minutes
FILE_MAX_AGE_SECONDS = 3600      # 1 hour
TARGET_DIRECTORIES = ["uploads", "temp_reports"]

async def cleanup_task():
    """
    Background task that periodically deletes files older than 1 hour 
    from target directories.
    """
    logger.info("Starting background cleanup service...")
    
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            now = time.time()
            deleted_count = 0
            
            for directory in TARGET_DIRECTORIES:
                if not os.path.exists(directory):
                    continue
                    
                for filename in os.listdir(directory):
                    # Skip .gitkeep or other hidden files if any
                    if filename.startswith("."):
                        continue
                        
                    file_path = os.path.join(directory, filename)
                    
                    # Check file age
                    if os.path.isfile(file_path):
                        file_age = now - os.path.getmtime(file_path)
                        
                        if file_age > FILE_MAX_AGE_SECONDS:
                            try:
                                os.remove(file_path)
                                deleted_count += 1
                                logger.info(f"Deleted expired file: {file_path}")
                            except Exception as e:
                                logger.error(f"Failed to delete {file_path}: {e}")
            
            if deleted_count > 0:
                logger.info(f"Cleanup cycle complete. Deleted {deleted_count} files.")
            else:
                logger.info("Cleanup cycle complete. No expired files found.")
                
        except asyncio.CancelledError:
            logger.info("Cleanup service stopping...")
            break
        except Exception as e:
            logger.error(f"Unexpected error in cleanup service: {e}")
            await asyncio.sleep(60) # Wait a bit before retrying if something crashed
