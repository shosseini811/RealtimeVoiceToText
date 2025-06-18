#!/usr/bin/env python3
"""
Fix SSL certificate issues on macOS for Python

SSL (Secure Sockets Layer) certificates are digital certificates that verify
the identity of websites and enable secure connections. Sometimes on macOS,
Python can't find the proper SSL certificates, causing connection errors
when trying to access secure websites or APIs.

This script fixes those SSL certificate issues by:
1. Setting up the correct certificate paths
2. Configuring environment variables that Python uses to find certificates
3. Creating a proper SSL context for secure connections
"""

# Import statements - these bring in external libraries we need
import ssl      # Built-in Python library for SSL/TLS connections
import certifi  # Third-party library that provides Mozilla's certificate bundle
import os       # Built-in Python library for operating system interactions

# STEP 1: Configure SSL certificate file paths
# Environment variables are special variables that programs can read
# to understand how they should behave

# SSL_CERT_FILE tells Python where to find the SSL certificate file
# certifi.where() returns the path to the certificate bundle that certifi provides
os.environ['SSL_CERT_FILE'] = certifi.where()

# REQUESTS_CA_BUNDLE is used by the 'requests' library (popular for HTTP requests)
# CA stands for "Certificate Authority" - these are trusted organizations
# that issue SSL certificates
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

# STEP 2: Print confirmation messages
# This helps us verify that the certificates were configured correctly
print(f"SSL certificates configured:")
print(f"SSL_CERT_FILE: {os.environ['SSL_CERT_FILE']}")
print(f"REQUESTS_CA_BUNDLE: {os.environ['REQUESTS_CA_BUNDLE']}")

# STEP 3: Create a custom SSL context
# An SSL context is an object that contains SSL configuration settings
# ssl.create_default_context() creates a context with secure default settings
# cafile parameter specifies which certificate file to use for verification
ssl_context = ssl.create_default_context(cafile=certifi.where())

# Print success message
print(f"\nSSL context created successfully")

# WHAT THIS SCRIPT ACCOMPLISHES:
# - Fixes SSL certificate verification errors on macOS
# - Sets up proper certificate paths for Python to use
# - Creates a reusable SSL context for secure connections
# - Helps prevent "SSL: CERTIFICATE_VERIFY_FAILED" errors 