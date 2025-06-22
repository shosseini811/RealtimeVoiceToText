"""
🔍 INTERACTIVE DEEPGRAM CLIENT INSPECTOR

This script provides simple functions you can use in a Python console
or Jupyter notebook to explore the Deepgram client interactively.

USAGE IN PYTHON CONSOLE:
>>> from inspect_deepgram_interactive import *
>>> client = create_client()
>>> show_basic_info(client)
>>> explore_listen(client)
>>> show_all_methods(client)

Perfect for beginners who want to experiment and learn!
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_client():
    """Create and return a Deepgram client"""
    try:
        from deepgram import DeepgramClient
        
        api_key = os.getenv("DEEPGRAM_API_KEY")
        if not api_key:
            print("❌ DEEPGRAM_API_KEY not found in .env file")
            return None
        
        client = DeepgramClient(api_key)
        print(f"✅ Deepgram client created: {client}")
        return client
        
    except ImportError:
        print("❌ Deepgram SDK not installed. Run: pip install deepgram-sdk==3.2.7")
        return None
    except Exception as e:
        print(f"❌ Error creating client: {e}")
        return None

def show_basic_info(client):
    """Show basic information about the Deepgram client"""
    if not client:
        print("❌ No client provided")
        return
    
    print("📊 BASIC CLIENT INFORMATION")
    print("-" * 40)
    print(f"Type: {type(client)}")
    print(f"Class: {client.__class__}")
    print(f"Module: {client.__module__}")

def show_all_attributes(client):
    """Show all public attributes of the client"""
    if not client:
        print("❌ No client provided")
        return
    
    print("📋 ALL PUBLIC ATTRIBUTES")
    print("-" * 40)
    
    attrs = [attr for attr in dir(client) if not attr.startswith('_')]
    
    for i, attr in enumerate(attrs, 1):
        try:
            value = getattr(client, attr)
            attr_type = type(value).__name__
            is_callable = "🔧" if callable(value) else "📌"
            print(f"{i:2d}. {is_callable} {attr:<15} → {attr_type}")
        except Exception as e:
            print(f"{i:2d}. ❌ {attr:<15} → Error: {e}")

def explore_listen(client):
    """Explore the 'listen' attribute in detail"""
    if not client:
        print("❌ No client provided")
        return
    
    if not hasattr(client, 'listen'):
        print("❌ Client doesn't have 'listen' attribute")
        return
    
    print("🎤 LISTEN ATTRIBUTE EXPLORATION")
    print("-" * 40)
    
    listen = client.listen
    print(f"Listen object: {listen}")
    print(f"Listen type: {type(listen)}")
    
    # Show listen attributes
    listen_attrs = [attr for attr in dir(listen) if not attr.startswith('_')]
    print(f"Listen attributes: {listen_attrs}")
    
    # Explore live transcription
    if hasattr(listen, 'live'):
        print(f"\n🔴 LIVE TRANSCRIPTION:")
        live = listen.live
        print(f"   Type: {type(live)}")
        live_methods = [attr for attr in dir(live) 
                       if not attr.startswith('_') and callable(getattr(live, attr))]
        print(f"   Methods: {live_methods}")

def quick_start():
    """Quick start function that shows everything at once"""
    print("🚀 DEEPGRAM CLIENT QUICK EXPLORATION")
    print("=" * 50)
    
    # Create client
    client = create_client()
    if not client:
        return
    
    # Show basic info
    show_basic_info(client)
    print()
    
    # Show attributes
    show_all_attributes(client)
    print()
    
    # Explore listen
    explore_listen(client)
    
    print("\n✅ Exploration complete!")

if __name__ == "__main__":
    quick_start() 