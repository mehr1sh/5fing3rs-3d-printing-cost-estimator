import os
import httpx
from typing import Optional
from app.models.job import Job
from app.models.slicing_result import SlicingResult

MAILTRAP_API_TOKEN = os.getenv("MAILTRAP_API_TOKEN", "")
MAILTRAP_API_URL = os.getenv("MAILTRAP_API_URL", "https://send.api.mailtrap.io/api")
MAILTRAP_FROM_EMAIL = os.getenv("MAILTRAP_FROM_EMAIL", "noreply@fivefingers.com")
MAILTRAP_FROM_NAME = os.getenv("MAILTRAP_FROM_NAME", "3D Printing Platform")

async def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
    """Send email via Mailtrap API."""
    if not MAILTRAP_API_TOKEN:
        # In development, just log the email
        print("========================================")
        print(f"Email would be sent to {to_email}: {subject}")
        print(html_body)
        print("========================================")
        return True
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MAILTRAP_API_URL}/send",
                headers={
                    "Authorization": f"Bearer {MAILTRAP_API_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": {
                        "email": MAILTRAP_FROM_EMAIL,
                        "name": MAILTRAP_FROM_NAME
                    },
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "html": html_body,
                    "text": text_body or html_body
                },
                timeout=10.0
            )
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

async def send_upload_success_email(job: Job, user_email: Optional[str] = None) -> bool:
    """Send email notification when file is uploaded successfully."""
    if not user_email:
        return False
    
    subject = f"3D Print Job Created - {job.job_id}"
    html_body = f"""
    <html>
    <body>
        <h2>Your 3D Print Job Has Been Created</h2>
        <p><strong>Job ID:</strong> {job.job_id}</p>
        <p><strong>Filename:</strong> {job.original_filename}</p>
        <p><strong>File Size:</strong> {job.file_size / 1024 / 1024:.2f} MB</p>
        <p><strong>Status:</strong> {job.status}</p>
        <p>Next steps:</p>
        <ol>
            <li>View your model in the 3D viewer</li>
            <li>Configure slicing parameters</li>
            <li>Start the slicing process</li>
            <li>Review the cost estimate</li>
        </ol>
        <p>You can view your job at: <a href="http://localhost:3000/job/{job.job_id}">View Job</a></p>
    </body>
    </html>
    """
    
    return await send_email(user_email, subject, html_body)

async def send_slicing_complete_email(job: Job, slicing_result: SlicingResult, user_email: Optional[str] = None) -> bool:
    """Send email notification when slicing is complete."""
    if not user_email:
        return False
    
    subject = f"Model Sliced Successfully - {job.original_filename}"
    print_time_hours = slicing_result.print_time_seconds / 3600 if slicing_result.print_time_seconds else 0
    
    html_body = f"""
    <html>
    <body>
        <h2>Your Model Has Been Sliced Successfully</h2>
        <p><strong>Job ID:</strong> {job.job_id}</p>
        <p><strong>Filename:</strong> {job.original_filename}</p>
        <h3>Slicing Results:</h3>
        <ul>
            <li><strong>Print Time:</strong> {print_time_hours:.2f} hours</li>
            <li><strong>Material Weight:</strong> {slicing_result.material_weight_grams:.2f} grams</li>
            <li><strong>Layer Count:</strong> {slicing_result.layer_count}</li>
            <li><strong>Estimated Cost:</strong> ₹{slicing_result.estimated_cost:.2f}</li>
        </ul>
        <p>You can now review the G-code preview and download the file.</p>
        <p><a href="http://localhost:3000/job/{job.job_id}">View Job Details</a></p>
    </body>
    </html>
    """
    
    return await send_email(user_email, subject, html_body)

async def send_slicing_failed_email(job: Job, error_message: str, user_email: Optional[str] = None) -> bool:
    """Send email notification when slicing fails."""
    if not user_email:
        return False
    
    subject = f"Slicing Error - Action Required - {job.original_filename}"
    html_body = f"""
    <html>
    <body>
        <h2>Slicing Error</h2>
        <p><strong>Job ID:</strong> {job.job_id}</p>
        <p><strong>Filename:</strong> {job.original_filename}</p>
        <h3>Error Details:</h3>
        <p>{error_message}</p>
        <h3>Suggested Fixes:</h3>
        <ul>
            <li>Check if the model has thin walls (&lt; 0.8mm)</li>
            <li>Ensure the model is watertight (no holes)</li>
            <li>Verify the model fits within the build volume</li>
            <li>Try adjusting slicing parameters</li>
        </ul>
        <p>If the problem persists, please contact support.</p>
        <p><a href="http://localhost:3000/job/{job.job_id}">View Job Details</a></p>
    </body>
    </html>
    """
    
    return await send_email(user_email, subject, html_body)

async def send_otp_email(user_email: str, code: str) -> bool:
    """Send a 6-digit OTP code for email verification."""
    subject = "Verify your 3D Printing Platform Email"
    html_body = f"""
    <html>
    <body>
        <h2>Email Verification</h2>
        <p>Welcome to the 3D Printing Platform!</p>
        <p>Your verification code is: <strong><span style="font-size: 24px;">{code}</span></strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
    </body>
    </html>
    """
    
    return await send_email(user_email, subject, html_body)
