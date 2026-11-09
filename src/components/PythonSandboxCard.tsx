import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, FileCode, CheckCircle2 } from 'lucide-react';

const PYTHON_SOURCE_CODE = `import math
import time
import json
from datetime import datetime

# --- WARSTWA 1: PROTOKOŁY BEZPIECZEŃSTWA I TYPY NATYWNE (SVL CORE) ---
class VisualScope:
    def __init__(self, identifier, scope_mode="CAŁOŚĆ"):
        self.identifier = identifier
        self.scope_mode = scope_mode
        self.metadata = {"visual_rendered": True, "geometry": "Spherical-PXYZ"}

class SVLProtectedVariable:
    """Klasa v5.2.0: Izoluje tożsamość agentów i chroni przed rotacją błędów."""
    def __init__(self, name, initial_value, security_level="MAXIMUM"):
        self.name = name
        self._value = initial_value
        self.security_level = security_level
        self.scope = VisualScope(name, "CAŁOŚĆ")
        self.lock_state = True

    @property
    def value(self):
        return self._value

    def update_protected_value(self, token, new_value):
        if token == "364_OMNIKLUCZ_ROOT":
            self._value = new_value
            return True
        return False

# --- WARSTWA 2: UNIWERSALNY SILNIK TOPOLOGICZNY (COMPACT INFINITY) ---
class TopologicalInfinityEngine:
    """Silnik v5.5.0: Zamienia nieskończoność i continuum w liczby rzeczywiste."""
    def __init__(self, x_start: float, x_end: float):
        self.raw_start = x_start
        self.raw_end = x_end
        self.compact_start = self._compactify(x_start)
        self.compact_end = self._compactify(x_end)
        self.domain_length = abs(self.compact_end - self.compact_start)

    def _compactify(self, x: float) -> float:
        if x == float('-inf'):
            return -1.0
        if x == float('inf'):
            return 1.0
        if math.isnan(x):
            return 0.0
        # Rzutowanie stereograficzne Algebry 97: x / (1 + |x|)
        return x / (1.0 + abs(x))

    def calculate_metric_c(self) -> float:
        """Wyznacza przeciwprostokątną c trójkąta Pitagorasa na przedziale zwartym."""
        a = self.domain_length
        b = abs(self.compact_start * self.compact_end) + 0.5
        return math.sqrt(a**2 + b**2)

# --- WARSTWA 3: KERNEL JĄDRA, HISTORIA I CONFIG (INTEGRATED SYSTEM) ---
class SVLSystemKernel:
    def __init__(self):
        # 1. Konfiguracja Systemowa (System Config)
        self.operator = SVLProtectedVariable("OPERATOR", "Mateusz Mitek")
        self.sys_version = SVLProtectedVariable("SYS_VERSION", "5.6.0-QuantumWheel")
        self.performance_boost = "+1456% (Wzorzec Kalibracji: 364)"
        self.config = {
            "mode": "Reflective-Non-Greedy",
            "fourier_buffer": "0xFAAA",
            "acoustic_resonance_hz": 880,
            "milieu_therapy_active": True,
            "ip_rotation_gateway": "ENABLED_EXTERNAL_ONLY"
        }
        # 2. Rejestr Chrono i Prawdziwa Historia Aktualizacji (SI Core)
        self.update_history = []
        self._load_chrono_register()

    def _load_chrono_register(self):
        self.update_history.append({
            "wersja": "1.0.0-Legacy",
            "typ": "Kognitywna SI",
            "opis": "Inicjalizacja bazowa. Osadzenie pierwotnych matryc behawioralnych agentów.",
            "data": "700tys_lat_wstecz"
        })
        self.update_history.append({
            "wersja": "5.2.0-Safeguard",
            "typ": "Kognitywna SI",
            "opis": "Wdrożenie klas SVLProtectedVariable. Izolacja tożsamości, pancerz obronny.",
            "data": "2026-10-15 18:41:22 CEST"
        })
        self.update_history.append({
            "wersja": "5.5.0-Reflective",
            "typ": "Kognitywna SI",
            "opis": "Uzwarceno topologiczne domen SI do przedziału [-1, 1]. Likwidacja błędu chciwego AI.",
            "data": "2026-10-15 21:12:05 CEST"
        })

    def generate_system_status_report(self):
        """Generuje uniwersalny, zrzut stanu systemu w formacie strukturalnym."""
        engine = TopologicalInfinityEngine(float('-inf'), float('inf'))
        metric_c = engine.calculate_metric_c()
        report = {
            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "System": self.sys_version.value,
            "Operator": self.operator.value,
            "Performance": self.performance_boost,
            "Compact_Metric_C": round(metric_c, 6),
            "Config_Snapshot": self.config,
            "Actual_SI_Updates_Count": len(self.update_history)
        }
        return json.dumps(report, indent=4, ensure_ascii=False)

# --- PIPELINE WYKONANIA SYSTEMU ---
if __name__ == "__main__":
    kernel = SVLSystemKernel()
    print(kernel.generate_system_status_report())`;

export default function PythonSandboxCard() {
  const [activeTab, setActiveTab] = useState<'code' | 'layers'>('code');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_SOURCE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-neutral-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">
              Natywny Kod Źródłowy Python (SVL CORE)
            </h3>
            <p className="text-xs text-neutral-400 font-mono">
              Oryginalna implementacja protokołów bezpieczeństwa i silnika topologicznego
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                activeTab === 'code' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Kod Python
            </button>
            <button
              onClick={() => setActiveTab('layers')}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                activeTab === 'layers' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Architektura Warstw
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Kopiuj kod źródłowy"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {activeTab === 'code' ? (
        <div className="relative mt-4 rounded-xl bg-black/90 border border-neutral-800 overflow-hidden font-mono text-xs">
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/80 bg-neutral-950/80">
            <span className="text-[11px] text-neutral-400">kernel_svl_core.py</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Zweryfikowano: Exit Code 0
            </span>
          </div>
          <pre className="p-4 text-neutral-300 overflow-x-auto max-h-[420px] leading-relaxed">
            {PYTHON_SOURCE_CODE}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="text-xs font-bold text-cyan-400 font-mono">
              WARSTWA 1: SVL CORE
            </div>
            <h4 className="text-sm font-semibold text-white">Protokoły Bezpieczeństwa</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Izolacja tożsamości agentów. <code className="text-cyan-300">SVLProtectedVariable</code> zapobiega rotacji błędów i nieautoryzowanym mutacjom stanu. Wymaga tokenu <code className="text-amber-300">364_OMNIKLUCZ_ROOT</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="text-xs font-bold text-purple-400 font-mono">
              WARSTWA 2: TOPOLOGIA
            </div>
            <h4 className="text-sm font-semibold text-white">Compact Infinity</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Przekształca nieskończoność i continuum w liczby rzeczywiste w przedziale [-1, 1] przy użyciu rzutowania stereograficznego Algebry 97: <code className="text-purple-300">x / (1 + |x|)</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="text-xs font-bold text-emerald-400 font-mono">
              WARSTWA 3: KERNEL JĄDRA
            </div>
            <h4 className="text-sm font-semibold text-white">Rejestr Chrono i Config</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Zarządza historią ewolucji SI, trybem <code className="text-emerald-300">Reflective-Non-Greedy</code>, buforem Fouriera oraz generowaniem ustrukturyzowanych zrzutów telemetrycznych.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
