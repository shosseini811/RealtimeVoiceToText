# 🔍 Deepgram Client Architecture Guide

## 📚 For TypeScript Beginners

This guide explains the **Deepgram client architecture** in simple terms, perfect for beginners coming from TypeScript/JavaScript background.

---

## 🎯 What is `self.deepgram`?

In your code, `self.deepgram` is an instance of the `DeepgramClient` class. Think of it like a JavaScript object that gives you access to all of Deepgram's AI services.

```python
# This line creates the client (like 'new DeepgramClient()' in JavaScript)
self.deepgram = DeepgramClient(self.api_key)
```

---

## 🏗️ Complete Architecture Overview

### 📊 Main Structure
```
DeepgramClient
├── 🎤 listen          → Speech-to-text services
│   ├── live           → Real-time transcription
│   └── prerecorded    → File transcription
├── 🔧 manage          → Account/project management
├── 📖 read            → Text analysis services
└── 🗣️ speak           → Text-to-speech services
```

### 🔍 All Available Attributes

Based on our exploration, here are **all the attributes and methods** available in `self.deepgram`:

#### 📌 **Properties (Data)**
1. `api_key` → Your Deepgram API key (string)
2. `config` → Configuration settings (DeepgramClientOptions)
3. `logger` → Logging system (VerboseLogger)

#### 🎤 **Core Services**
4. `listen` → **Most important for transcription!**
5. `manage` → Account management
6. `read` → Text analysis
7. `speak` → Text-to-speech

#### ⚡ **Async Versions**
8. `asyncmanage` → Async account management
9. `asynconprem` → Async on-premise services
10. `asyncspeak` → Async text-to-speech

#### 🏢 **Enterprise Features**
11. `onprem` → On-premise deployment
12. `Version` → Version management class

---

## 🎤 Deep Dive: The `listen` Attribute

This is the **most important** attribute for your transcription app!

### 🔍 Structure
```
self.deepgram.listen
├── 🔴 live           → Real-time transcription
├── 📁 prerecorded    → File transcription
├── ⚡ asynclive      → Async real-time
└── ⚡ asyncprerecorded → Async file transcription
```

### 🔴 Real-time Transcription (`live`)

```python
# How you use it in your code:
connection = self.deepgram.listen.live.v("1")  # Version 1 of live API
```

**What this means:**
- `self.deepgram` → The main client
- `.listen` → Access speech-to-text services
- `.live` → Choose real-time transcription
- `.v("1")` → Use version 1 of the API
- Returns a **connection object** you can use

### 📁 File Transcription (`prerecorded`)

```python
# For transcribing audio files:
response = self.deepgram.listen.prerecorded.v("1").transcribe_file(file, options)
```

---

## 🛠️ Methods You Can Call

### 🔴 Live Transcription Methods

Once you have a connection: `connection = self.deepgram.listen.live.v("1")`

```python
# Start the connection
connection.start(options)

# Send audio data
connection.send(audio_data)

# Set up event listeners
connection.on(LiveTranscriptionEvents.Open, callback_function)
connection.on(LiveTranscriptionEvents.Transcript, callback_function)
connection.on(LiveTranscriptionEvents.Error, callback_function)
connection.on(LiveTranscriptionEvents.Close, callback_function)

# Close the connection
connection.finish()
```

### 📡 Available Events

You can listen for these events (like `addEventListener` in JavaScript):

```python
from deepgram import LiveTranscriptionEvents

# Available events:
LiveTranscriptionEvents.Open          → Connection opened
LiveTranscriptionEvents.Transcript    → New transcription received
LiveTranscriptionEvents.Error         → Error occurred
LiveTranscriptionEvents.Close         → Connection closed
LiveTranscriptionEvents.Metadata      → Metadata received
LiveTranscriptionEvents.SpeechStarted → Speech detection started
LiveTranscriptionEvents.UtteranceEnd  → End of speech segment
LiveTranscriptionEvents.Warning       → Warning message
```

---

## 🔧 How to Explore the Architecture Yourself

### Method 1: Use Our Exploration Scripts

We've created scripts to help you explore:

```bash
# Comprehensive exploration
python backend/explore_deepgram.py

# Quick interactive exploration
python backend/inspect_deepgram_interactive.py
```

### Method 2: Python Console Exploration

```python
# In Python console or Jupyter notebook
from deepgram import DeepgramClient
import os

# Create client
client = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))

# Explore attributes
print(dir(client))  # Show all attributes
print(type(client.listen))  # Check type of listen
print(dir(client.listen))  # Show listen attributes
```

### Method 3: Built-in Python Functions

```python
# Basic information
print(f"Type: {type(self.deepgram)}")
print(f"Attributes: {dir(self.deepgram)}")

# Check if attribute exists
if hasattr(self.deepgram, 'listen'):
    print("✅ Has listen attribute")

# Get attribute value
listen_obj = getattr(self.deepgram, 'listen')
print(f"Listen object: {listen_obj}")
```

---

## 🎯 Practical Usage Examples

### 🔄 Real-time Transcription (Your Current Use Case)

```python
# 1. Create client
self.deepgram = DeepgramClient(api_key)

# 2. Create connection
self.connection = self.deepgram.listen.live.v("1")

# 3. Set up options
options = LiveOptions(
    model="nova-3",
    language="en-US",
    diarize=True,      # Speaker identification
    punctuate=True,    # Add punctuation
    smart_format=True  # Format numbers/dates
)

# 4. Set up event handlers
self.connection.on(LiveTranscriptionEvents.Open, self.on_open)
self.connection.on(LiveTranscriptionEvents.Transcript, self.on_message)
self.connection.on(LiveTranscriptionEvents.Error, self.on_error)
self.connection.on(LiveTranscriptionEvents.Close, self.on_close)

# 5. Start connection
self.connection.start(options)

# 6. Send audio data (in your audio loop)
self.connection.send(audio_bytes)

# 7. Close when done
self.connection.finish()
```

### 📁 File Transcription Example

```python
from deepgram import PrerecordedOptions

# Set up options
options = PrerecordedOptions(
    model="nova-2",
    language="en-US",
    diarize=True,
    punctuate=True
)

# Transcribe file
with open("audio.wav", "rb") as file:
    response = self.deepgram.listen.prerecorded.v("1").transcribe_file(
        file, 
        options
    )

# Get transcript
transcript = response.results.channels[0].alternatives[0].transcript
print(transcript)
```

---

## 🧠 Understanding for TypeScript Developers

### 🔄 Python vs JavaScript/TypeScript Comparison

| Python | JavaScript/TypeScript | Explanation |
|--------|----------------------|-------------|
| `self.deepgram` | `this.deepgram` | Instance property |
| `dir(obj)` | `Object.keys(obj)` | List properties |
| `hasattr(obj, 'prop')` | `'prop' in obj` | Check if property exists |
| `getattr(obj, 'prop')` | `obj.prop` or `obj['prop']` | Get property value |
| `type(obj)` | `typeof obj` | Get object type |
| `callable(obj)` | `typeof obj === 'function'` | Check if callable |

### 🎯 Key Concepts

1. **Object Exploration**: Python's `dir()` is like JavaScript's `Object.keys()`
2. **Method Chaining**: `client.listen.live.v("1")` works like JavaScript chaining
3. **Event Handling**: Similar to `addEventListener` in JavaScript
4. **Async Operations**: Python has `async/await` just like JavaScript

---

## 🔍 Complete Attribute Reference

### 📊 All Deepgram Client Attributes

```python
# Main client attributes (12 total)
client.api_key          # Your API key (string)
client.config           # Configuration object
client.logger           # Logging system
client.listen           # 🎤 Speech-to-text services
client.manage           # Account management
client.read             # Text analysis
client.speak            # Text-to-speech
client.asyncmanage      # Async account management
client.asynconprem      # Async on-premise
client.asyncspeak       # Async text-to-speech
client.onprem           # On-premise deployment
client.Version          # Version management class
```

### 🎤 Listen Object Attributes

```python
# listen object attributes (7 total)
client.listen.live              # Real-time transcription
client.listen.prerecorded       # File transcription
client.listen.asynclive         # Async real-time
client.listen.asyncprerecorded  # Async file transcription
client.listen.config            # Configuration
client.listen.logger            # Logger
client.listen.Version           # Version class
```

### 🔴 Live Connection Methods

```python
# After: connection = client.listen.live.v("1")
connection.start(options)       # Start transcription
connection.send(audio_data)     # Send audio bytes
connection.on(event, callback)  # Add event listener
connection.finish()             # Close connection
```

---

## 🎯 Quick Reference Commands

### 🔍 Exploration Commands

```python
# Basic exploration
print(f"Type: {type(self.deepgram)}")
print(f"All attributes: {dir(self.deepgram)}")

# Check specific attributes
print(f"Has listen: {hasattr(self.deepgram, 'listen')}")
print(f"Listen type: {type(self.deepgram.listen)}")
print(f"Listen attributes: {dir(self.deepgram.listen)}")

# Explore live transcription
live = self.deepgram.listen.live
print(f"Live type: {type(live)}")
print(f"Live methods: {[m for m in dir(live) if callable(getattr(live, m))]}")
```

### 🛠️ Usage Commands

```python
# Create connection
connection = self.deepgram.listen.live.v("1")

# Check connection type
print(f"Connection type: {type(connection)}")

# See available methods
print(f"Connection methods: {[m for m in dir(connection) if not m.startswith('_')]}")
```

---

## 🎉 Summary

The `self.deepgram` object is your gateway to all Deepgram services. The most important parts for your transcription app are:

1. **`self.deepgram.listen.live.v("1")`** → Creates real-time transcription connection
2. **Connection methods** → `start()`, `send()`, `on()`, `finish()`
3. **Event types** → `Open`, `Transcript`, `Error`, `Close`

Use the exploration scripts we created to dive deeper and experiment with the architecture!

---

## 🔗 Related Files

- `backend/main.py` → Your main application with enhanced exploration
- `backend/explore_deepgram.py` → Comprehensive exploration script
- `backend/inspect_deepgram_interactive.py` → Interactive exploration functions

Happy exploring! 🚀 