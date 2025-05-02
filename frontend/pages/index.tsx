// import Image from 'next/image'
import { Inter } from 'next/font/google'
import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Button from '@/components/Button';
import { FiArrowRight, FiMail, FiClock, FiTag, FiCalendar, FiMessageCircle, FiCheck, FiGlobe } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

const inter = Inter({ subsets: ['latin'] })

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        <div className="container-custom mx-auto px-4 relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.h1 
              custom={0} 
              variants={fadeIn} 
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              Transform Your <span className="heading-gradient">Email Experience</span> with AI
            </motion.h1>
            
            <motion.p 
              custom={1}
              variants={fadeIn}
              className="text-xl text-gray-300 mb-8"
            >
              A unified email management platform that streamlines communication, 
              enhances productivity, and reduces digital overwhelm.
            </motion.p>

            <motion.div 
              custom={2}
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/login">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Get Started <FiArrowRight className="ml-2" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </Link>
            </motion.div>
          </motion.div>
          
          {/* Floating illustration */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-16 max-w-5xl mx-auto relative"
          >
            <div className="rounded-2xl overflow-hidden border border-dark-border shadow-lg">
              <div className="bg-dark-bg/80 p-1 border-b border-dark-border flex items-center gap-2">
                <div className="flex space-x-1.5 ml-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="w-full text-center text-sm text-gray-400">InboxIQ Dashboard</div>
              </div>
              <div className="bg-gradient-to-b from-dark-card to-dark-bg w-full h-72 sm:h-80 md:h-96 flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <FiMail size={48} className="mx-auto mb-4 text-primary-light" />
                  <p>Dashboard visualization will appear here</p>
                </div>
              </div>
            </div>
            
            {/* Glow effect below the dashboard */}
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-3/4 h-20 bg-primary/20 blur-3xl rounded-full"></div>
          </motion.div>
        </div>

        {/* Background animation */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full filter blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full filter blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-dark-bg to-black">
        <div className="container-custom mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            <StatCard number="10x" text="Faster Email Processing" />
            <StatCard number="60%" text="Reduction in Response Time" />
            <StatCard number="83%" text="Users Report Less Email Stress" />
            <StatCard number="24/7" text="AI-Powered Assistance" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-black">
        <div className="container-custom mx-auto px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 
              custom={0}
              variants={fadeIn}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Powerful <span className="heading-gradient">Features</span>
            </motion.h2>
            <motion.p 
              custom={1}
              variants={fadeIn}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Discover how InboxIQ transforms your email productivity
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <Feature 
              icon={<FiMessageCircle size={24} />}
              title="Natural Language Processing"
              description="Compose and send emails using simple conversational commands, eliminating the complexity of formal email drafting."
              index={0}
            />
            
            <Feature 
              icon={<FiClock size={24} />}
              title="Automated Workflows"
              description="Set up routines for email threads to automate repetitive tasks, such as follow-ups or meeting scheduling."
              index={1}
            />
            
            <Feature 
              icon={<FiMail size={24} />}
              title="Intelligent Prioritization"
              description="Get proactive notifications for action-required messages with context-aware suggestions."
              index={2}
            />
            
            <Feature 
              icon={<FiTag size={24} />}
              title="Unified Inbox Management"
              description="Consolidate multiple email accounts under one interface with powerful tagging for better organization."
              index={3}
            />
            
            <Feature 
              icon={<FiCalendar size={24} />}
              title="Calendar Integration"
              description="Seamlessly check availability and schedule meetings directly from your email interface."
              index={4}
            />
            
            <Feature 
              icon={<FiGlobe size={24} />}
              title="Integration Ecosystem"
              description="Connect with external tools to enhance productivity directly through email commands."
              index={5}
            />
          </motion.div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-24 bg-gradient-to-b from-black to-dark-bg">
        <div className="container-custom mx-auto px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 
              custom={0}
              variants={fadeIn}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              How InboxIQ <span className="heading-gradient">Works</span>
            </motion.h2>
            <motion.p 
              custom={1}
              variants={fadeIn}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              A simple three-step process to transform your email experience
            </motion.p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
            <Step 
              number="01" 
              title="Connect Your Accounts" 
              description="Securely link your email accounts through OAuth, no passwords stored."
            />
            <Step 
              number="02" 
              title="Customize Preferences" 
              description="Set priority levels, notification preferences, and automation rules."
            />
            <Step 
              number="03" 
              title="Enjoy the Experience" 
              description="Let AI handle the heavy lifting while you focus on what matters."
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-dark-bg">
        <div className="container-custom mx-auto px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 
              custom={0}
              variants={fadeIn}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              What Our Users <span className="heading-gradient">Say</span>
            </motion.h2>
            <motion.p 
              custom={1}
              variants={fadeIn}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Join thousands who have transformed their email workflow
            </motion.p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Testimonial 
              quote="InboxIQ has completely changed how I approach email. I save at least an hour every day."
              author="Sarah J."
              role="Marketing Director"
            />
            <Testimonial 
              quote="The AI suggestions are spot-on. It's like having an email assistant that actually understands context."
              author="Michael T."
              role="Project Manager"
            />
            <Testimonial 
              quote="I've tried every email tool out there, and nothing comes close to the productivity boost InboxIQ provides."
              author="Priya K."
              role="Startup Founder"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-dark-bg to-black">
        <div className="container-custom mx-auto px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="bg-dark-card rounded-2xl p-8 md:p-12 max-w-4xl mx-auto text-center shadow-lg border border-dark-border relative overflow-hidden"
          >
            {/* Abstract shapes in the background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl -z-0"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full filter blur-3xl -z-0"></div>
            
            <div className="relative z-10">
              <motion.h2 
                custom={0}
                variants={fadeIn}
                className="text-3xl md:text-4xl font-bold mb-4"
              >
                Ready to Transform Your Email Experience?
              </motion.h2>
              
              <motion.p 
                custom={1}
                variants={fadeIn}
                className="text-lg text-gray-300 mb-8"
              >
                Join thousands of professionals who have already boosted their productivity with InboxIQ.
              </motion.p>
              
              <motion.div 
                custom={2}
                variants={fadeIn}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link href="/login">
                  <Button variant="primary" size="lg">
                    Get Started Now
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg">
                    View Pricing
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-black border-t border-dark-border">
        <div className="container-custom mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <div className="mb-4">
                <span className="text-primary font-bold text-2xl">Inbox</span>
                <span className="text-white font-bold text-2xl">IQ</span>
              </div>
              <p className="text-gray-400">
                A unified email management platform powered by AI
              </p>
              <div className="flex space-x-4 mt-6">
                <SocialIcon icon="twitter" />
                <SocialIcon icon="linkedin" />
                <SocialIcon icon="github" />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-4">Product</h3>
              <ul className="space-y-3">
                <FooterLink href="/features">Features</FooterLink>
                <FooterLink href="/pricing">Pricing</FooterLink>
                <FooterLink href="/integrations">Integrations</FooterLink>
                <FooterLink href="/roadmap">Roadmap</FooterLink>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-4">Company</h3>
              <ul className="space-y-3">
                <FooterLink href="/about">About</FooterLink>
                <FooterLink href="/blog">Blog</FooterLink>
                <FooterLink href="/careers">Careers</FooterLink>
                <FooterLink href="/contact">Contact</FooterLink>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-4">Legal</h3>
              <ul className="space-y-3">
                <FooterLink href="/privacy">Privacy Policy</FooterLink>
                <FooterLink href="/terms">Terms of Service</FooterLink>
                <FooterLink href="/cookies">Cookie Policy</FooterLink>
                <FooterLink href="/security">Security</FooterLink>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-dark-border text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} InboxIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description, index }) => {
  return (
    <motion.div 
      custom={index}
      variants={fadeIn}
      whileHover={{ y: -5 }}
      className="card hover:border-primary hover:shadow-glow transition-all duration-300"
    >
      <div className="feature-icon">{icon}</div>
      <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  );
};

const Step: React.FC<{number: string; title: string; description: string}> = ({ number, title, description }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center text-center px-4"
    >
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 border border-primary/40">
        <span className="text-2xl font-bold text-primary">{number}</span>
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  );
};

const Testimonial: React.FC<{quote: string; author: string; role: string}> = ({ quote, author, role }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.5 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-soft"
    >
      <div className="text-primary text-4xl mb-4">&ldquo;</div>
      <p className="text-gray-300 mb-6">{quote}</p>
      <div>
        <p className="font-medium">{author}</p>
        <p className="text-gray-500 text-sm">{role}</p>
      </div>
    </motion.div>
  );
};

const StatCard: React.FC<{number: string; text: string}> = ({ number, text }) => {
  return (
    <div className="text-center p-6">
      <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{number}</div>
      <p className="text-gray-300">{text}</p>
    </div>
  );
};

const SocialIcon: React.FC<{icon: string}> = ({ icon }) => {
  return (
    <a href="#" className="w-10 h-10 rounded-full bg-dark-card border border-dark-border flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-colors">
      <span className={`devicon-${icon}-original`}></span>
    </a>
  );
};

const FooterLink: React.FC<{href: string; children: React.ReactNode}> = ({ href, children }) => {
  return (
    <li>
      <Link href={href} className="text-gray-400 hover:text-white transition-colors">
        {children}
      </Link>
    </li>
  );
};
