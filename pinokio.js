module.exports = {
  version: "2.0",
  title: "SoundScape Studio",
  description: "Audio-reactive music video visualizer with VST mastering, high-frequency strobe FX, and GPU-accelerated OpenAI Whisper timed lyrics.",
  icon: "public/pwa-192x192.png",
  menu: async (kernel, info) => {
    const installed = info.exists("env");
    const running = {
      install: info.running("install.js"),
      start: info.running("start.js"),
      update: info.running("update.js"),
      reset: info.running("reset.js"),
    };

    if (running.install) {
      return [
        {
          default: true,
          icon: "fa-solid fa-plug",
          text: "Installing Python & Web Build...",
          href: "install.js",
        },
      ];
    }

    if (installed) {
      if (running.start) {
        const local = info.local("start.js");
        if (local && local.url) {
          return [
            {
              default: true,
              icon: "fa-solid fa-rocket",
              text: "Open SoundScape Studio",
              href: local.url,
            },
            {
              icon: "fa-solid fa-terminal",
              text: "Python Bridge Terminal",
              href: "start.js",
            },
          ];
        }
        return [
          {
            default: true,
            icon: "fa-solid fa-terminal",
            text: "Starting Python Bridge...",
            href: "start.js",
          },
        ];
      }

      if (running.update) {
        return [
          {
            default: true,
            icon: "fa-solid fa-arrows-rotate",
            text: "Updating...",
            href: "update.js",
          },
        ];
      }

      if (running.reset) {
        return [
          {
            default: true,
            icon: "fa-solid fa-broom",
            text: "Resetting...",
            href: "reset.js",
          },
        ];
      }

      return [
        {
          default: true,
          icon: "fa-solid fa-power-off",
          text: "Start Studio (Python + Web UI)",
          href: "start.js",
        },
        {
          icon: "fa-solid fa-arrows-rotate",
          text: "Update & Rebuild",
          href: "update.js",
        },
        {
          icon: "fa-solid fa-plug",
          text: "Reinstall Environment",
          href: "install.js",
        },
        {
          icon: "fa-regular fa-circle-xmark",
          text: "Reset",
          href: "reset.js",
          confirm: "Reset the Python virtual environment and compiled dist/ folder?",
        },
      ];
    }

    return [
      {
        default: true,
        icon: "fa-solid fa-plug",
        text: "Install (Python Bindings + Whisper + Build)",
        href: "install.js",
      },
    ];
  },
};
