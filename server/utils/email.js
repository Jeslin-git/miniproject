import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendVerificationEmail = async (to, token) => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    
    // If credentials are not set or are placeholders, just log the verification link to the console
    if (!user || !pass || user === 'yourname@gmail.com' || pass === 'your16charapppassword') {
        console.log('\n=========================================');
        console.log('📧  EMAIL VERIFICATION (Mock Send)');
        console.log('-----------------------------------------');
        console.log(`To: ${to}`);
        console.log(`Link: http://localhost:5173/#verify-email?token=${token}`);
        console.log('=========================================\n');
        return true;
    }

    const verificationLink = `http://localhost:5173/#verify-email?token=${token}`;

    const mailOptions = {
        from: `"PyScape Auth" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Verify your email address - PyScape',
        html: `
            <h2>Welcome to PyScape!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${verificationLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
                Verify Email
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
                Or copy and paste this link into your browser:<br>
                ${verificationLink}
            </p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};
