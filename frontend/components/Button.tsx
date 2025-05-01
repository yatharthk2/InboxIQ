import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  type = 'button',
}) => {
  // Base classes
  let buttonClasses = 'btn rounded-lg font-medium inline-flex items-center justify-center transition-all duration-300 ';
  
  // Size classes
  if (size === 'sm') {
    buttonClasses += 'px-4 py-2 text-sm ';
  } else if (size === 'lg') {
    buttonClasses += 'px-8 py-4 text-lg ';
  } else {
    buttonClasses += 'px-6 py-3 ';
  }
  
  // Variant classes
  if (variant === 'primary') {
    buttonClasses += 'bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg hover:shadow-primary/20 ';
  } else if (variant === 'secondary') {
    buttonClasses += 'bg-secondary text-white hover:bg-secondary/90 shadow-md hover:shadow-lg hover:shadow-secondary/20 ';
  } else if (variant === 'outline') {
    buttonClasses += 'bg-transparent border border-dark-border text-white hover:border-primary hover:text-primary ';
  } else if (variant === 'ghost') {
    buttonClasses += 'bg-transparent text-white hover:bg-white/10 ';
  }
  
  // Disabled classes
  if (disabled) {
    buttonClasses += 'opacity-50 cursor-not-allowed ';
  }
  
  return (
    <motion.button
      type={type}
      className={`${buttonClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      whileHover={disabled ? {} : { translateY: -2 }}
    >
      {children}
    </motion.button>
  );
};

export default Button;
