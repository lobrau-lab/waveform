module.exports = {
  run: [
    // Windows NVIDIA CUDA
    {
      when: "{{platform === 'win32' && gpu === 'nvidia'}}",
      method: "shell.run",
      params: {
        venv: "{{args && args.venv ? args.venv : 'env'}}",
        path: "{{args && args.path ? args.path : '.'}}",
        message: "uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124",
      },
    },
    // Windows AMD / CPU fallback
    {
      when: "{{platform === 'win32' && gpu !== 'nvidia'}}",
      method: "shell.run",
      params: {
        venv: "{{args && args.venv ? args.venv : 'env'}}",
        path: "{{args && args.path ? args.path : '.'}}",
        message: "uv pip install torch torchvision torchaudio",
      },
    },
    // macOS (Apple Silicon MPS / Intel CPU)
    {
      when: "{{platform === 'darwin'}}",
      method: "shell.run",
      params: {
        venv: "{{args && args.venv ? args.venv : 'env'}}",
        path: "{{args && args.path ? args.path : '.'}}",
        message: "uv pip install torch torchvision torchaudio",
      },
    },
    // Linux NVIDIA CUDA
    {
      when: "{{platform === 'linux' && gpu === 'nvidia'}}",
      method: "shell.run",
      params: {
        venv: "{{args && args.venv ? args.venv : 'env'}}",
        path: "{{args && args.path ? args.path : '.'}}",
        message: "uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124",
      },
    },
    // Linux AMD ROCm
    {
      when: "{{platform === 'linux' && gpu === 'amd'}}",
      method: "shell.run",
      params: {
        venv: "{{args && args.venv ? args.venv : 'env'}}",
        path: "{{args && args.path ? args.path : '.'}}",
        message: "uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.2",
      },
    },
    // Linux CPU fallback
    {
      when: "{{platform === 'linux' && gpu !== 'nvidia' && gpu !== 'amd'}}",
      method: "shell.run",
      params: {
        venv: "{{args && args.venv ? args.venv : 'env'}}",
        path: "{{args && args.path ? args.path : '.'}}",
        message: "uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu",
      },
    },
  ],
};
