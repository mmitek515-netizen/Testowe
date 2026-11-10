# Testowe · real host root CLI (opt-in)

The normal Testowe backend runs in its own runtime (usually a Docker
container). UID 0 inside a container **is not host-root**. The optional
\`testowe-root.service\` runs **on the actual Debian 13 host** as UID 0
and accepts commands solely over a group-protected Unix-domain socket.

## Install on a trusted Debian 13 host

The administrator should review the service and shell-execution code
before installation. Do **not** publish this socket or give its group
access to untrusted applications.

\`\`\`bash
sudo groupadd -f testowe-cli
sudo install -d -m 0700 /var/lib/testowe
sudo install -d -m 0755 /usr/local/lib/testowe
sudo install -m 0700 integrations/host-root/host_root_service.py /usr/local/lib/testowe/host_root_service.py
sudo install -m 0644 integrations/host-root/testowe-root.service /etc/systemd/system/testowe-root.service
sudo systemctl daemon-reload
sudo systemctl enable --now testowe-root.service
sudo systemctl status testowe-root.service --no-pager
\`\`\`

The \`/run/testowe-root/cli.sock\` socket is mode 0660,
owned by root:testowe-cli. Grant only the trusted Testowe backend
identity access to the group. For non-containerized Node, e.g.:

\`\`\`bash
sudo usermod -aG testowe-cli testowe-backend
\`\`\`

When running Node inside Docker, a group mapping and private
bind-mount of the socket are required. The default Compose file
does **not** mount the socket. This avoids accidental root exposure.

Enable the API gateway for a private HTTPS deployment using a
random 32+ character token kept in host environment:

\`\`\`bash
HOST_CLI_ENABLED=1
HOST_CLI_SOCKET=/run/testowe-root/cli.sock
HOST_CLI_TOKEN=<your-own-random-operator-secret>
\`\`\`

**Never commit or put real secrets in a URL.** The operator enters the
token in the terminal UI, and the backend authenticates each request.
Do not put the administrative UI on unauthenticated public Workers,
Pages or AI Studio previews.

## Actual privileges

- Scope \`linux-host-root\` only appears when this separate root
  service returned UID 0 over the mounted host socket.
- Without the host socket, commands run in the Node application
  process scope, NOT on the host.
- The browser cannot acquire root on its own.
- \`Binary Hyperspace Kernel 128-bit\` is a 128-dimension binary
  vector intent classifier copied from SVL_System, NOT a 128-bit
  CPU architecture or a Linux kernel implementation.
- Kernel operations (\`modprobe\`, \`sysctl\`, building modules) depend
  on the actual host, kernel configuration, installed tools and
  command privileges. No promise that every command can succeed.

## Agents and maintenance

SPAA currently contains four local worker labels (Aria, Alex,
Astyria and Aurelius), not proof of connected original external
identities. Keep automatic diagnostics / analysis / repair proposals
separate from privileged execution. For autonomous host repairs, use
explicit approved repair recipes with audit logs and rollout checks;
do not pass arbitrary model output directly to host-root.
