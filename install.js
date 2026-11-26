module.exports = {
  run: [
    // 1. Install GPU-aware PyTorch inside Pinokio venv ("env") for OpenAI Whisper
    {
      method: "script.start",
      params: {
        uri: "torch.js",
        params: {
          venv: "env",
          path: ".",
        },
      },
    },
    // 2. Install SoundScape Python bindings, FastAPI bridge, OpenCV, librosa, and openai-whisper
    {
      method: "shell.run",
      params: {
        venv: "env",
        message: [
          "uv pip install -r requirements.txt",
        ],
      },
    },
    // 3. Build the React + Vite web bundle directly via Python bindings
    {
      method: "shell.run",
      params: {
        venv: "env",
        message: [
          "python soundscape_bindings.py build --install",
          "python soundscape_bindings.py info",
        ],
      },
    },
    {
      method: "notify",
      params: {
        html: "SoundScape Studio installed & built! Click 'Start Studio (Python + Web UI)' to launch.",
      },
    },
  ],
};
