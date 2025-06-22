#!/usr/bin/env python3
"""
🔍 STANDALONE DEEPGRAM CLIENT ARCHITECTURE EXPLORER

This script helps you understand the structure and capabilities of the Deepgram client
without running the full application. Perfect for learning and debugging!

WHAT THIS SCRIPT DOES:
1. Creates a Deepgram client (like in your main app)
2. Explores all its attributes and methods
3. Shows you the complete architecture
4. Provides practical examples

HOW TO RUN:
1. Make sure you have your .env file with DEEPGRAM_API_KEY
2. Run: python explore_deepgram.py

As a TypeScript beginner, this will help you understand:
- How to inspect objects in Python (similar to console.log in JavaScript)
- What methods and properties are available
- How the Deepgram SDK is organized
"""

import os
import sys
import inspect
import json
from typing import Any, Dict, List
from dotenv import load_dotenv

# Add the current directory to Python path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Try to import Deepgram
try:
    from deepgram import DeepgramClient, LiveOptions, PrerecordedOptions, LiveTranscriptionEvents
    print("✅ Deepgram SDK imported successfully!")
except ImportError as e:
    print(f"❌ Failed to import Deepgram SDK: {e}")
    print("💡 Try: pip install deepgram-sdk==3.2.7")
    sys.exit(1)

def explore_object_deeply(obj: Any, name: str = "Object", max_depth: int = 3, current_depth: int = 0) -> Dict:
    """
    Recursively explore an object's structure
    
    This function is like a super-powered version of console.log() in JavaScript.
    It goes deep into objects to show you everything inside them.
    
    Args:
        obj: The object to explore
        name: Name to display for this object
        max_depth: How deep to go (prevents infinite recursion)
        current_depth: Current recursion depth (internal use)
    
    Returns:
        Dictionary containing the object's structure
    """
    if current_depth >= max_depth:
        return {"type": type(obj).__name__, "value": str(obj)[:100]}
    
    result = {
        "name": name,
        "type": type(obj).__name__,
        "module": getattr(obj, "__module__", "unknown"),
        "attributes": {},
        "methods": {},
        "callable": callable(obj)
    }
    
    # Get all attributes (like properties in JavaScript objects)
    try:
        attributes = dir(obj)
        
        for attr_name in attributes:
            # Skip private attributes (starting with _) to avoid clutter
            if attr_name.startswith('_'):
                continue
                
            try:
                attr_value = getattr(obj, attr_name)
                attr_type = type(attr_value).__name__
                
                if callable(attr_value):
                    # This is a method/function
                    try:
                        signature = inspect.signature(attr_value)
                        result["methods"][attr_name] = {
                            "signature": str(signature),
                            "type": attr_type
                        }
                    except (ValueError, TypeError):
                        result["methods"][attr_name] = {
                            "signature": "signature not available",
                            "type": attr_type
                        }
                else:
                    # This is a property/attribute
                    if hasattr(attr_value, '__dict__') or hasattr(attr_value, '__class__'):
                        # This is a complex object, explore it recursively
                        result["attributes"][attr_name] = explore_object_deeply(
                            attr_value, attr_name, max_depth, current_depth + 1
                        )
                    else:
                        # This is a simple value
                        result["attributes"][attr_name] = {
                            "type": attr_type,
                            "value": str(attr_value)[:100]  # Limit string length
                        }
                        
            except Exception as e:
                result["attributes"][attr_name] = {"error": str(e)}
                
    except Exception as e:
        result["error"] = str(e)
    
    return result

def print_structure(structure: Dict, indent: int = 0) -> None:
    """
    Pretty print the object structure
    
    This makes the output readable and organized, like a tree structure.
    """
    prefix = "  " * indent
    
    print(f"{prefix}📦 {structure['name']} ({structure['type']})")
    
    if structure.get('module') != 'unknown':
        print(f"{prefix}   📍 Module: {structure['module']}")
    
    # Print attributes (properties)
    if structure.get('attributes'):
        print(f"{prefix}   📋 Attributes:")
        for attr_name, attr_info in structure['attributes'].items():
            if isinstance(attr_info, dict) and 'name' in attr_info:
                # This is a nested object
                print(f"{prefix}     🔗 {attr_name}:")
                print_structure(attr_info, indent + 3)
            else:
                # This is a simple attribute
                attr_type = attr_info.get('type', 'unknown')
                attr_value = attr_info.get('value', '')
                print(f"{prefix}     📌 {attr_name}: {attr_type}")
                if attr_value and len(attr_value) < 50:
                    print(f"{prefix}        💡 Value: {attr_value}")
    
    # Print methods (functions)
    if structure.get('methods'):
        print(f"{prefix}   🛠️  Methods:")
        for method_name, method_info in structure['methods'].items():
            signature = method_info.get('signature', '')
            print(f"{prefix}     ⚙️  {method_name}{signature}")

def main():
    """
    Main function that explores the Deepgram client
    """
    print("🚀 DEEPGRAM CLIENT ARCHITECTURE EXPLORER")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    # Get API key
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        print("❌ DEEPGRAM_API_KEY not found in environment variables")
        print("💡 Please add your API key to the .env file")
        return
    
    print(f"✅ API key loaded: {api_key[:10]}...")
    
    # Create Deepgram client
    try:
        print("\n🔗 Creating Deepgram client...")
        deepgram = DeepgramClient(api_key)
        print(f"✅ Deepgram client created: {deepgram}")
    except Exception as e:
        print(f"❌ Failed to create Deepgram client: {e}")
        return
    
    # 🔍 BASIC EXPLORATION
    print(f"\n📊 BASIC INFORMATION")
    print("-" * 40)
    print(f"🏷️  Type: {type(deepgram)}")
    print(f"🏷️  Class: {deepgram.__class__}")
    print(f"🏷️  Module: {deepgram.__module__}")
    print(f"🏷️  String representation: {str(deepgram)}")
    
    # 📋 LIST ALL ATTRIBUTES
    print(f"\n📋 ALL ATTRIBUTES AND METHODS")
    print("-" * 40)
    all_attrs = dir(deepgram)
    public_attrs = [attr for attr in all_attrs if not attr.startswith('_')]
    
    print(f"📊 Total attributes: {len(all_attrs)}")
    print(f"🌟 Public attributes: {len(public_attrs)}")
    print(f"🔒 Private attributes: {len(all_attrs) - len(public_attrs)}")
    
    print("\n🌟 PUBLIC ATTRIBUTES:")
    for i, attr in enumerate(public_attrs, 1):
        try:
            attr_value = getattr(deepgram, attr)
            attr_type = type(attr_value).__name__
            is_callable = "🔧" if callable(attr_value) else "📌"
            print(f"   {i:2d}. {is_callable} {attr:<15} → {attr_type}")
        except Exception as e:
            print(f"   {i:2d}. ❌ {attr:<15} → Error: {e}")
    
    # 🎯 FOCUS ON KEY ATTRIBUTES
    print(f"\n🎯 KEY ATTRIBUTES DEEP DIVE")
    print("-" * 40)
    
    key_attributes = ['listen', 'manage', 'read', 'speak']
    
    for attr_name in key_attributes:
        if hasattr(deepgram, attr_name):
            print(f"\n🔑 EXPLORING: {attr_name.upper()}")
            attr_value = getattr(deepgram, attr_name)
            structure = explore_object_deeply(attr_value, attr_name, max_depth=2)
            print_structure(structure, indent=1)
        else:
            print(f"\n❌ {attr_name} not found")
    
    # 🎤 SPECIAL FOCUS ON LISTEN (MOST IMPORTANT FOR TRANSCRIPTION)
    print(f"\n🎤 LISTEN ATTRIBUTE - DETAILED EXPLORATION")
    print("-" * 40)
    
    if hasattr(deepgram, 'listen'):
        listen_obj = deepgram.listen
        print(f"📡 Listen object: {listen_obj}")
        print(f"📡 Listen type: {type(listen_obj)}")
        
        # Explore listen.live (real-time transcription)
        if hasattr(listen_obj, 'live'):
            print(f"\n🔴 LIVE TRANSCRIPTION:")
            live_obj = listen_obj.live
            print(f"   Type: {type(live_obj)}")
            print(f"   Methods: {[m for m in dir(live_obj) if not m.startswith('_') and callable(getattr(live_obj, m))]}")
            
            # Show how to use the version method
            if hasattr(live_obj, 'v'):
                print(f"   🔢 Version method available: live.v('1')")
                print(f"   💡 Usage: connection = deepgram.listen.live.v('1')")
        
        # Explore listen.prerecorded (file transcription)
        if hasattr(listen_obj, 'prerecorded'):
            print(f"\n📁 PRERECORDED TRANSCRIPTION:")
            prerecorded_obj = listen_obj.prerecorded
            print(f"   Type: {type(prerecorded_obj)}")
            print(f"   Methods: {[m for m in dir(prerecorded_obj) if not m.startswith('_') and callable(getattr(prerecorded_obj, m))]}")
    
    # 🛠️ SHOW PRACTICAL USAGE EXAMPLES
    print(f"\n🛠️ PRACTICAL USAGE EXAMPLES")
    print("-" * 40)
    
    print("🔄 Real-time transcription setup:")
    print("   connection = deepgram.listen.live.v('1')")
    print("   options = LiveOptions(model='nova-2', language='en-US')")
    print("   connection.start(options)")
    print("   connection.send(audio_data)")
    
    print("\n📁 File transcription:")
    print("   options = PrerecordedOptions(model='nova-2', language='en-US')")
    print("   response = deepgram.listen.prerecorded.v('1').transcribe_file(file, options)")
    
    print("\n📡 Event handling:")
    print("   connection.on(LiveTranscriptionEvents.Open, on_open)")
    print("   connection.on(LiveTranscriptionEvents.Transcript, on_message)")
    print("   connection.on(LiveTranscriptionEvents.Error, on_error)")
    print("   connection.on(LiveTranscriptionEvents.Close, on_close)")
    
    # 🔬 ADVANCED INSPECTION
    print(f"\n🔬 ADVANCED INSPECTION")
    print("-" * 40)
    
    # Show internal state if available
    if hasattr(deepgram, '__dict__'):
        print("📦 Internal state (__dict__):")
        for key, value in deepgram.__dict__.items():
            print(f"   {key}: {type(value).__name__}")
    
    # Show class hierarchy
    print(f"\n🏗️ Class hierarchy:")
    mro = type(deepgram).__mro__
    for i, cls in enumerate(mro):
        print(f"   {'  ' * i}└── {cls}")
    
    # 📚 AVAILABLE EVENTS
    print(f"\n📚 AVAILABLE LIVE TRANSCRIPTION EVENTS")
    print("-" * 40)
    
    events = [attr for attr in dir(LiveTranscriptionEvents) if not attr.startswith('_')]
    print("🎯 Events you can listen for:")
    for event in events:
        event_value = getattr(LiveTranscriptionEvents, event)
        print(f"   📡 {event} = '{event_value}'")
    
    print(f"\n✅ EXPLORATION COMPLETE!")
    print("=" * 60)
    print("💡 Use this information to understand how to work with the Deepgram client!")

if __name__ == "__main__":
    main() 