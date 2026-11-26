module.exports = {
  daemon: true,
  run: [
    {
      method: "shell.run",
      params: {
        venv: "env",
        env: {
          PYTHONUNBUFFERED: "1",
        },
        message: [
          "python pinokio_server.py --host 127.0.0.1 --port {{port}} --auto-build",
        ],
        on: [
          {
            event: "/http:\\/\\/127\\.0\\.0\\.1:[0-9]+/",
            done: true,
          },
        ],
      },
    },
    {
      method: "local.set",
      params: {
        url: "{{input.event[0]}}",
      },
    },
  ],
};
