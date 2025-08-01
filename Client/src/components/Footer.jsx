import React from 'react'
import "../styles/Footer.css";

const Footer = () => {
  return (
    <footer>
        <div className="footer-container">
            <p className="footer-note">Built with ❤️ for the YouTube community</p>
            <p className="footer-warning">
                Note: This is a demo interface. Actual video downloading requires backend processing
                and compliance with YouTube's Terms of Service.
            </p>
        </div>
    </footer>
  )
}

export default Footer
