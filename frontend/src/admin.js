import { MuseClient } from 'https://cdn.skypack.dev/muse-js';

export class MusePanel {
    constructor(panelId, defaultIp = '127.0.0.1', defaultPort = 8000) {
        this.panelId = panelId;
        
        // DOM Elements
        this.oscStatus = document.getElementById(`osc-status-${panelId}`);
        this.oscLog = document.getElementById(`osc-log-${panelId}`);
        this.inpOscIp = document.getElementById(`inp-osc-ip-${panelId}`);
        this.inpOscPort = document.getElementById(`inp-osc-port-${panelId}`);
        this.btnUpdateConn = document.getElementById(`btn-update-conn-${panelId}`);
        this.btnConnectMuse = document.getElementById(`btn-connect-muse-${panelId}`);
        
        this.indState = document.getElementById(`indicator-state-${panelId}`);
        this.indDesc = document.getElementById(`indicator-desc-${panelId}`);
        this.progContainer = document.getElementById(`progress-bar-container-${panelId}`);
        this.progBar = document.getElementById(`progress-bar-${panelId}`);

        // State variables
        this.ws = null;
        this.museClient = null;
        
        this.appState = 'INITIALIZING'; 
        this.calibrationData = [];
        this.baselinePromedio = 1;
        this.baselineStdDev = 0.001;
        this.smoothedCalmScore = 0;
        this.calibrationProgress = 0;
        this.MA_WINDOW = 180;
        this.lastNCampsScores = [];
        this.dynamicAlphaEma = 0.05;
        this.sessionTotalTicks = 0;
        this.sessionCalmTicks = 0;
        this.calmFinal = 0.0;
        this.calibTriggerFired = false;
        this.TARGET_CALIBRATION_SAMPLES = 1800;
        
        this.rawAlpha = 0.5;
        this.rawBeta = 0.5;
        this.rawGamma = 0.1;
        this.rawTheta = 0.5;
        this.rawDelta = 0.5;
        
        this.currentGyro = [0, 0, 0];
        this.currentAccel = [0, 0, 0];
        this.sensorOn = 0;
        this.sensorActive = 0;
        this.eegWatchdog = null;
        
        this.currentBpm = 75;
        this.headsetName = `Muse_${panelId}`;

        // Initialize UI values
        if(this.inpOscIp) this.inpOscIp.value = defaultIp;
        if(this.inpOscPort) this.inpOscPort.value = defaultPort;

        this.initOSCRelay();
        this.attachListeners();
    }

    smooth(current, target, factor = 0.05) {
        if (current === undefined || Number.isNaN(current)) return target;
        return current + (target - current) * factor;
    }

    logOSC(msg) {
        if(!this.oscLog) return;
        const entry = document.createElement('div');
        entry.innerText = msg;
        this.oscLog.appendChild(entry);
        if (this.oscLog.children.length > 30) this.oscLog.removeChild(this.oscLog.firstChild);
        this.oscLog.scrollTop = this.oscLog.scrollHeight;
    }

    initOSCRelay() {
        this.ws = new WebSocket('ws://localhost:3000');
        this.ws.onopen = () => {
            if(this.oscStatus) {
                this.oscStatus.innerText = "ONLINE";
                this.oscStatus.className = "status-indicator online";
            }
            this.logOSC("¡Conectado al servidor de Relay WS!");
            
            // Force config update with our specific panel's IP/Port
            if(this.inpOscIp && this.inpOscPort) {
                this.ws.send(JSON.stringify({
                    type: 'config_update',
                    ip: this.inpOscIp.value,
                    port: parseInt(this.inpOscPort.value)
                }));
            }
        };
        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'config_sync') {
                // Ignore global sync since we handle our own IP via config_update
            } else if(msg.status === 'info') {
                this.logOSC(`[Server Info] ${msg.msg}`);
            }
        };
        this.ws.onclose = () => {
            if (this.oscStatus && this.oscStatus.innerText !== "OFFLINE") {
                this.oscStatus.innerText = "OFFLINE";
                this.oscStatus.className = "status-indicator offline";
                this.logOSC("Error/Desconectado. Reintentando en 5s...");
            }
            setTimeout(() => this.initOSCRelay(), 5000);
        };
        this.ws.onerror = () => { };
    }

    setAppState(state, desc) {
        this.appState = state;
        if(this.indState) this.indState.innerText = state;
        if(this.indDesc) this.indDesc.innerText = desc;
    }

    broadcastFullTelemetry(calmScore) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            let outBpm = this.currentBpm;
            let outA = this.rawAlpha, outB = this.rawBeta, outG = this.rawGamma, outT = this.rawTheta, outD = this.rawDelta;
            let outCalm = calmScore;
            let outGyro = this.currentGyro;
            let outAccel = this.currentAccel;
            let outCalib = this.calibrationProgress;
            let outCalmFinal = this.calmFinal;
            
            let outCalibCompleted = 0.0;
            if (this.appState === 'RUNNING' && !this.calibTriggerFired) {
                outCalibCompleted = 1.0;
                this.calibTriggerFired = true;
            } else if (this.appState !== 'RUNNING') {
                this.calibTriggerFired = false;
            }
            
            // Kill-switch coercitivo MODIFICADO
            // En lugar de forzar ceros, mantenemos el último valor de TODAS las variables
            // para que actúe como un "Hold / Interpolación visual" y el gráfico en Unreal no caiga a 0.
            if (this.sensorOn === 0 || this.sensorActive === 0) {
                // outCalm, outBpm, outGyro, outAccel, etc. mantienen su último estado válido.
            }

            this.ws.send(JSON.stringify({ 
                type: 'full_telemetry', 
                sensorOn: this.sensorOn,
                sensorActive: this.sensorActive,
                gyro: outGyro,
                accel: outAccel,
                alpha: outA,
                beta: outB,
                gamma: outG,
                theta: outT,
                delta: outD,
                calm: outCalm,
                bpm: outBpm,
                calibProgress: outCalib,
                calm_final: outCalmFinal,
                calib_completed: outCalibCompleted,
                headset_id: this.headsetName
            }));
        }
    }

    attachListeners() {
        if(this.btnUpdateConn) {
            this.btnUpdateConn.addEventListener('click', () => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.logOSC(`Cambiando IP/Puerto a ${this.inpOscIp.value}:${this.inpOscPort.value}...`);
                    this.ws.send(JSON.stringify({
                        type: 'config_update',
                        ip: this.inpOscIp.value,
                        port: parseInt(this.inpOscPort.value)
                    }));
                } else {
                    this.logOSC("FALLO: El servidor WS no está corriendo.");
                }
            });
        }

        if(this.btnConnectMuse) {
            this.btnConnectMuse.addEventListener('click', async () => this.connectMuse());
        }
    }

    async connectMuse() {
        try {
            if (!navigator.bluetooth) {
                alert("⚠️ Web Bluetooth no soportado."); return;
            }

            this.setAppState('CONNECTING', 'Emparejando casco Bluetooth...');
            this.btnConnectMuse.innerText = "CONECTANDO...";
            if (!this.museClient) { this.museClient = new MuseClient(); }
            await this.museClient.connect();
            await this.museClient.start();
            
            this.headsetName = this.museClient.deviceName || `Muse_${this.panelId}`;
            
            this.btnConnectMuse.innerText = `CONECTADO (${this.headsetName})`;
            this.btnConnectMuse.disabled = true;
            
            this.sensorOn = 1;

            this.museClient.connectionStatus.subscribe(status => {
                this.sensorOn = status ? 1 : 0;
                if (!status) {
                    this.sensorActive = 0;
                    this.setAppState('DISCONNECTED', 'Enlace Bluetooth desconectado.');
                    this.btnConnectMuse.innerText = "RECONECTAR MUSE";
                    this.btnConnectMuse.disabled = false;
                }
            });

            this.setAppState('CALIBRATING', 'Cierra los ojos y relájate...');
            if(this.progContainer) this.progContainer.style.display = "block";

            setInterval(() => {
                let currentRatio = this.rawAlpha / (this.rawBeta + (0.4 * this.rawGamma) + 0.001); 
                let isArtifact = this.rawGamma > 0.8; 
                if (isArtifact) {
                    currentRatio = 0.0;
                }

                if (this.appState === 'CALIBRATING') {
                    if (this.sensorActive === 0) {
                        this.setAppState('CALIBRATING', 'Casco inactivo. Ajústalo a tu frente...');
                        this.broadcastFullTelemetry(0.0);
                        return; 
                    }

                    this.calibrationData.push(currentRatio);
                    this.calibrationProgress = (this.calibrationData.length / this.TARGET_CALIBRATION_SAMPLES);
                    if(this.progBar) this.progBar.style.width = `${Math.min(this.calibrationProgress * 100, 100)}%`;
                    
                    if (isArtifact) {
                        this.setAppState('CALIBRATING', '¡Ruido detectado! (Tensión muscular)');
                    } else {
                        this.setAppState('CALIBRATING', 'Cierra los ojos y relájate...');
                    }

                    if (this.calibrationData.length >= this.TARGET_CALIBRATION_SAMPLES) {
                        this.baselinePromedio = this.calibrationData.reduce((a, b) => a + b, 0) / this.calibrationData.length;
                        
                        let variance = this.calibrationData.reduce((a, b) => a + Math.pow(b - this.baselinePromedio, 2), 0) / this.calibrationData.length;
                        this.baselineStdDev = Math.sqrt(variance);
                        if (this.baselineStdDev < 0.0001) this.baselineStdDev = 0.0001; 

                        this.setAppState('RUNNING', `Base: ${this.baselinePromedio.toFixed(2)}`);
                        if(this.progContainer) this.progContainer.style.display = "none";
                    }

                    this.broadcastFullTelemetry(0.0);
                } else if (this.appState === 'RUNNING') {
                    this.calibrationProgress = 1.0;
                    if(this.indState && this.indState.innerText === 'RUNNING') this.setAppState('RUNNING', 'Sesion iniciada');
                    
                    let zScore = (currentRatio - this.baselinePromedio) / this.baselineStdDev;
                    zScore = Math.min(Math.max(zScore, -2.0), 2.0); 
                    let normalizedScore = (zScore + 2.0) / 4.0; 

                    this.lastNCampsScores.push(normalizedScore);
                    if (this.lastNCampsScores.length > this.MA_WINDOW) this.lastNCampsScores.shift();
                    
                    this.smoothedCalmScore = this.lastNCampsScores.reduce((a, b) => a + b, 0) / this.lastNCampsScores.length;

                    let finalOSCValue = this.smoothedCalmScore;

                    if (isArtifact) {
                        finalOSCValue = 0.0; 
                        this.setAppState('RUNNING', 'Ruido detectado (Calma a 0)');
                    }

                    if (this.sensorActive === 1) {
                        this.sessionTotalTicks++;
                        if (finalOSCValue > 0.7) this.sessionCalmTicks++;
                        this.calmFinal = this.sessionCalmTicks / this.sessionTotalTicks;
                    }

                    this.broadcastFullTelemetry(finalOSCValue);
                }
            }, 16); 

            this.museClient.eegReadings.subscribe(reading => {
                clearTimeout(this.eegWatchdog);
                this.sensorActive = 1;

                const samples = reading.samples;
                if (!samples || samples.length === 0) return;
                const avgPower = samples.reduce((acc, val) => acc + Math.abs(val), 0) / samples.length;
                
                // Si la potencia baja, evitamos marcar inactivo inmediatamente para no causar parpadeos drásticos
                if (avgPower < 1.0) {
                    // Esperaremos al watchdog para marcarlo como inactivo totalmente si no hay recuperación.
                } else {
                    this.sensorActive = 1;
                }
                
                this.rawAlpha = this.smooth(this.rawAlpha, ((avgPower * 0.1) % 1.0), this.dynamicAlphaEma); 
                this.rawBeta  = this.smooth(this.rawBeta,  ((avgPower * 0.2) % 1.0), 0.05);
                this.rawTheta = this.smooth(this.rawTheta, ((avgPower * 0.15) % 1.0), 0.05);
                this.rawDelta = this.smooth(this.rawDelta, ((avgPower * 0.05) % 1.0), 0.05);
                this.rawGamma = (avgPower > 400) ? 1.0 : this.smooth(this.rawGamma, 0.1, 0.05);
                this.currentBpm = this.smooth(this.currentBpm, 70 + (avgPower % 30), 0.01); 

                this.eegWatchdog = setTimeout(() => { this.sensorActive = 0; }, 800);
            });

            this.museClient.gyroscopeData.subscribe(reading => {
                if (reading.samples.length > 0) {
                    const s = reading.samples[reading.samples.length - 1];
                    this.currentGyro[0] = this.smooth(this.currentGyro[0], s.x, 0.2);
                    this.currentGyro[1] = this.smooth(this.currentGyro[1], s.y, 0.2);
                    this.currentGyro[2] = this.smooth(this.currentGyro[2], s.z, 0.2);
                }
            });

            this.museClient.accelerometerData.subscribe(reading => {
                if (reading.samples.length > 0) {
                    const s = reading.samples[reading.samples.length - 1];
                    this.currentAccel[0] = this.smooth(this.currentAccel[0], s.x, 0.2);
                    this.currentAccel[1] = this.smooth(this.currentAccel[1], s.y, 0.2);
                    this.currentAccel[2] = this.smooth(this.currentAccel[2], s.z, 0.2);

                    let magnitude = Math.sqrt(s.x*s.x + s.y*s.y + s.z*s.z);
                    this.dynamicAlphaEma = magnitude > 1.2 ? 0.01 : 0.05;
                }
            });
            
        } catch (e) {
            console.error(`[Panel ${this.panelId}] Error:`, e);
            this.sensorOn = 0;
            this.sensorActive = 0;
            this.setAppState('DISCONNECTED', 'Error al conectar.');
            this.btnConnectMuse.innerText = "ERROR - REINTENTAR";
            this.btnConnectMuse.disabled = false;
        }
    }
}
