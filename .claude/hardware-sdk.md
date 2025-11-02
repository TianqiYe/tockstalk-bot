# Distiller CM5 SDK Reference

Preinstalled hardware control and AI SDK for CM5 platform at `/opt/distiller-cm5-sdk/`.

## Hardware Modules

### Audio (`distiller_cm5_sdk.hardware.audio`)
```python
from distiller_cm5_sdk.hardware.audio import Audio
audio = Audio(
    sample_rate=48000,
    channels=2,
    format_type="S16_LE",
    input_device="hw:0,0",
    output_device="plughw:0"
)

# Record audio to file
audio.record(filepath="output.wav", duration=5)  # Fixed duration
audio.record(filepath="output.wav")  # Manual stop required

# Stream recording with callback
def audio_callback(data):
    print(f"Received {len(data)} bytes")
thread = audio.stream_record(callback=audio_callback, buffer_size=4096)
audio.stop_recording()

# Playback
audio.play(filepath="audio.wav")
audio.stream_play(audio_data, format_type="S16_LE", sample_rate=48000, channels=2)
audio.stop_playback()

# Volume control (hardware-specific)
audio.set_mic_gain(85)  # 0-100+
audio.set_speaker_volume(60)  # 0-100+
gain = audio.get_mic_gain()
volume = audio.get_speaker_volume()

# Status checks
is_recording = audio.is_recording()
is_playing = audio.is_playing()
audio.close()
```

### Camera (`distiller_cm5_sdk.hardware.camera`)
```python
from distiller_cm5_sdk.hardware.camera.camera import Camera
camera = Camera(
    resolution=(640, 480),
    framerate=30,
    rotation=0,  # 0, 90, 180, 270
    format='bgr'  # 'bgr', 'rgb', 'gray'
)

# Stream video with callback
def frame_callback(frame):
    # Process frame (numpy array)
    print(f"Frame shape: {frame.shape}")

camera.start_stream(callback=frame_callback)
# ... do other work ...
camera.stop_stream()

# Capture single frames
frame = camera.get_frame()  # Returns numpy array
camera.capture_image(filepath="photo.jpg")  # Save to file

# Adjust camera settings
camera.adjust_setting("brightness", 50)
camera.adjust_setting("contrast", 75)
current_brightness = camera.get_setting("brightness")

# Available settings
settings = camera.get_available_settings()
# ['brightness', 'contrast', 'saturation', 'hue', 'gain', 'exposure', 
#  'white_balance', 'focus', 'zoom', 'auto_exposure', 'auto_wb', 'sharpness']

camera.close()
```

### E-ink Display (`distiller_cm5_sdk.hardware.eink`)
```python
from distiller_cm5_sdk.hardware.eink import Display, DisplayMode
display = Display(auto_init=True)

# Display images
display.display_image("image.png", mode=DisplayMode.FULL)
display.display_image("image.png", mode=DisplayMode.PARTIAL, 
                     rotate=True, flip_horizontal=True, invert_colors=False)

# Display raw 1-bit data
raw_data = display.convert_png_to_raw("image.png")
display.display_image(raw_data, mode=DisplayMode.FULL, 
                     src_width=250, src_height=128)

# Auto-convert any PNG to display format
from distiller_cm5_sdk.hardware.eink import ScalingMethod, DitheringMethod
display.display_png_auto("any_image.png", 
                        scaling=ScalingMethod.LETTERBOX,
                        dithering=DitheringMethod.FLOYD_STEINBERG)

# Display control
display.clear()
display.sleep()
width, height = display.get_dimensions()  # (128, 250)

# Configuration (if supported)
display.set_firmware("EPD128x250")  # or "EPD240x416"
current_fw = display.get_firmware()

display.close()

# Convenience functions
from distiller_cm5_sdk.hardware.eink import display_png, clear_display
display_png("image.png", mode=DisplayMode.FULL, rotate=True)
clear_display()
```

### LED (`distiller_cm5_sdk.hardware.sam`)
```python
from distiller_cm5_sdk.hardware.sam import LED
led = LED(use_sudo=True)  # Requires sudo for sysfs access

# Per-LED control
led.set_rgb_color(led_id=0, red=255, green=0, blue=0)  # RGB 0-255
led.set_brightness(led_id=0, brightness=128)  # 0-255
led.turn_off(led_id=0)

# Get current state
red, green, blue = led.get_rgb_color(led_id=0)
brightness = led.get_brightness(led_id=0)

# All LEDs at once
led.set_color_all(red=0, green=255, blue=0)
led.set_brightness_all(200)
led.turn_off_all()

# Available LEDs
available = led.get_available_leds()  # [0, 1, 2, ...]

# Legacy compatibility method
led.set_led_color(r=255, g=0, b=0, brightness=0.5, led_id=0)  # brightness 0.0-1.0

# Note: Animation modes (blink, fade, rainbow) have been removed
# Only static color control is available in current version
```

## AI/ML Modules

### Parakeet - Speech Recognition (`distiller_cm5_sdk.parakeet`)
```python
from distiller_cm5_sdk.parakeet import Parakeet

# Initialize with custom config
asr = Parakeet(
    model_config={
        "device": "cpu",
        "num_threads": 4
    },
    audio_config={
        "channels": 1,
        "rate": 16000,
        "chunk": 512
    },
    vad_silence_duration=1.0
)

# Voice Activity Detection (VAD) mode - automatic recording
# Returns a Generator, iterate to get transcribed text
for text in asr.auto_record_and_transcribe():
    print(f"Transcribed: {text}")

# Streaming transcription
def transcription_callback(text):
    print(f"Transcribed: {text}")

asr.start_recording(callback=transcription_callback)
# ... speak ...
asr.stop_recording()
```

### Piper - Text-to-Speech (`distiller_cm5_sdk.piper`)
```python
from distiller_cm5_sdk.piper import Piper
tts = Piper()

# Stream speech directly to speakers
tts.speak_stream("Hello, world!")

# List available voices
voices = tts.list_voices()
```

## GPIO Pin-out

### Pin Layout

| Pin | Function | Pin | Function |
|-----|----------|-----|----------|
| 1   | 5V       | 2   | 3V3      |
| 3   | GND      | 4   | SDA1     |
| 5   | 14       | 6   | SCL1     |
| 7   | 15       | 8   | 17       |
| 9   | GND      | 10  | 27       |
| 11  | 24       | 12  | 22       |
| 13  | 25       | 14  | 12       |

### Interfaces

- **Power**: 5V, 3V3, GND
- **I2C**: SDA1 (GPIO 2), SCL1 (GPIO 3)  
- **UART**: GPIO 14 (TXD), GPIO 15 (RXD)
- **GPIO**: 12, 17, 22, 24, 25, 27

## Hardware Specs
- Display: 128x250 monochrome e-ink (configurable: EPD128x250, EPD240x416)
- Audio: Full-duplex ALSA with PamirAI soundcard controls
- Camera: libcamera/OpenCV (Raspberry Pi Camera Module support)
- LED: RGB via sysfs (`/sys/class/leds/pamir:led*`)
- Platform: ARM64 Linux (RPi CM5)

## Quick Reference

| Module | Primary Use | Key Features |
|--------|-------------|--------------|
| `distiller_cm5_sdk.hardware.audio` | Audio recording/playback | Hardware volume control, streaming, ALSA backend |
| `distiller_cm5_sdk.hardware.camera` | Image/video capture | libcamera backend, settings adjustment, streaming |
| `distiller_cm5_sdk.hardware.eink` | E-ink display control | Multiple refresh modes, image transformations, auto-conversion |
| `distiller_cm5_sdk.hardware.sam` | RGB LED control | Per-LED control, sysfs backend, static colors only |
| `distiller_cm5_sdk.parakeet` | Real-time ASR with VAD | Sherpa-ONNX backend, streaming transcription |
| `distiller_cm5_sdk.piper` | Text-to-speech | Voice selection, streaming output |
