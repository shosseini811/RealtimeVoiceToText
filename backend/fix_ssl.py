#!/usr/bin/env python3
"""
Fix SSL certificate issues on macOS for Python
"""
import ssl
import certifi
import os

# Set the SSL certificate environment variable
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

print(f"SSL certificates configured:")
print(f"SSL_CERT_FILE: {os.environ['SSL_CERT_FILE']}")
print(f"REQUESTS_CA_BUNDLE: {os.environ['REQUESTS_CA_BUNDLE']}")

# Create a custom SSL context
ssl_context = ssl.create_default_context(cafile=certifi.where())
print(f"\nSSL context created successfully") 