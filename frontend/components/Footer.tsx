import React from "react";
import Link from "next/link";
import { FiGithub, FiTwitter, FiLinkedin } from "react-icons/fi";

const Footer = () => {
  const getYear = () => {
    return new Date().getFullYear();
  };

  return (
    <footer className="py-12 bg-black border-t border-dark-border">
      <div className="container-custom mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <span className="text-primary font-bold text-2xl">Inbox</span>
              <span className="text-white font-bold text-2xl">IQ</span>
            </div>
            <p className="text-gray-400 text-sm">
              A unified email management platform powered by AI
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-4">Product</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-4">Company</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-dark-border text-center text-sm text-gray-500">
          <p>© {getYear()} InboxIQ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
