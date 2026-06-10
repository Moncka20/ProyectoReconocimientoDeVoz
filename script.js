/* ==========================================
   Ruleta de Vocabulario en Ingles
   Tecnologias: Web Speech API, SVG
   ========================================== */

(function() {
    'use strict';

    /* ========== 1. CONFIGURACION ========== */
    var WORDS = [
        'apple','dog','cat','house','school',
        'water','book','teacher','computer','music',
        'sun','moon','tree','star','bird',
        'fish','happy','blue','red','green'
    ];
    var TOTAL = WORDS.length;          // 20
    var ANGLE = 360 / TOTAL;           // 18 grados

    /* ========== 2. ESTADO ========== */
    var state = {
        rotation: 0,
        currentWord: '',
        spinning: false,
        listening: false,
        score: 0,
        correct: 0,
        incorrect: 0
    };

    /* ========== 3. REFERENCIAS DOM ========== */
    var $ = function(id) { return document.getElementById(id); };
    var wheelGroup = $('wheelGroup');
    var spinBtn = $('spinBtn');
    var listenBtn = $('listenBtn');
    var speakBtn = $('speakBtn');
    var wordEl = $('selectedWord');
    var feedbackEl = $('feedback');
    var statusEl = $('statusIndicator');
    var scoreEl = $('scoreVal');
    var correctEl = $('correctVal');
    var incorrectEl = $('incorrectVal');
    var modal = $('micPermissionModal');
    var modalBtn = $('micPermissionBtn');

    /* ========== 4. CREAR RULETA SVG ========== */
    function createWheel() {
        wheelGroup.innerHTML = '';
        for (var i = 0; i < TOTAL; i++) {
            var sa = -90 + i * ANGLE;          // start angle
            var ea = -90 + (i + 1) * ANGLE;    // end angle
            var sr = sa * Math.PI / 180;
            var er = ea * Math.PI / 180;

            var x1 = 250 + 220 * Math.cos(sr);
            var y1 = 250 + 220 * Math.sin(sr);
            var x2 = 250 + 220 * Math.cos(er);
            var y2 = 250 + 220 * Math.sin(er);

            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M 250 250 L ' + x1 + ' ' + y1 +
                ' A 220 220 0 0 1 ' + x2 + ' ' + y2 + ' Z');
            path.setAttribute('fill', 'hsl(' + (i * 18) + ', 65%, 55%)');
            path.setAttribute('stroke', '#1a1a2e');
            path.setAttribute('stroke-width', '2');
            wheelGroup.appendChild(path);

            var ma = sa + ANGLE / 2;            // mid angle
            var mr = ma * Math.PI / 180;
            var tx = 250 + 143 * Math.cos(mr);
            var ty = 250 + 143 * Math.sin(mr);

            var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', tx);
            text.setAttribute('y', ty);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '12');
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-weight', '700');
            text.setAttribute('font-family', 'Segoe UI, Arial, sans-serif');

            var rot = ma;
            var norm = ((ma % 360) + 360) % 360;
            if (norm > 90 && norm < 270) rot = ma + 180;
            text.setAttribute('transform', 'rotate(' + rot + ',' + tx + ',' + ty + ')');
            text.textContent = WORDS[i];

            var shadow = text.cloneNode(true);
            shadow.setAttribute('fill', 'rgba(0,0,0,0.3)');
            shadow.setAttribute('transform',
                'rotate(' + rot + ',' + tx + ',' + ty + ') translate(0.5,0.5)');
            wheelGroup.appendChild(shadow);
            wheelGroup.appendChild(text);
        }
    }

    /* ========== 5. LOGICA DE GIRO ========== */
    function getWordIndex(rotation) {
        var R = ((rotation % 360) + 360) % 360;
        var pa = ((270 - R) % 360 + 360) % 360;
        return Math.floor((((pa - 270) % 360 + 360) % 360) / ANGLE) % TOTAL;
    }

    function spin() {
        if (state.spinning) return;
        state.spinning = true;
        spinBtn.disabled = true;
        listenBtn.disabled = true;
        speakBtn.disabled = true;
        feedbackEl.className = 'feedback';
        feedbackEl.textContent = '';
        statusEl.textContent = 'Girando...';

        state.rotation += 360 * (5 + Math.random() * 3) + Math.random() * 360;
        wheelGroup.style.transform = 'rotate(' + state.rotation + 'deg)';
    }

    function onSpinStop() {
        state.spinning = false;
        var idx = getWordIndex(state.rotation);
        state.currentWord = WORDS[idx];
        wordEl.textContent = state.currentWord;
        wordEl.className = 'selected-word pop';

        statusEl.textContent = 'Escuchando la pronunciacion correcta...';
        speakWord(state.currentWord, enableButtons);
        setTimeout(enableButtons, 3000);
    }

    function enableButtons() {
        if (!listenBtn.disabled) return;
        listenBtn.disabled = false;
        speakBtn.disabled = false;
        spinBtn.disabled = false;
        statusEl.textContent = 'Presiona "Pronunciar" y repite la palabra';
        feedbackEl.className = 'feedback waiting';
        feedbackEl.textContent = 'Pronuncia la palabra en voz alta';
    }

    /* ========== 6. SINTESIS DE VOZ ========== */
    function speakWord(word, callback) {
        try {
            if (window.speechSynthesis) {
                if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
                var utter = new SpeechSynthesisUtterance(word);
                utter.lang = 'en-US';
                utter.rate = 0.85;
                utter.onend = callback;
                window.speechSynthesis.speak(utter);
            } else {
                if (callback) callback();
            }
        } catch (e) {
            if (callback) callback();
        }
    }

    /* ========== 7. RECONOCIMIENTO DE VOZ ========== */
    function startRecognition() {
        if (state.listening || !state.currentWord) return;
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            statusEl.textContent = 'Reconocimiento de voz no soportado. Usa Chrome.';
            speakBtn.disabled = true;
            return;
        }

        var recog = new SR();
        recog.lang = 'en-US';
        recog.continuous = false;
        recog.interimResults = false;
        recog.maxAlternatives = 3;

        state.listening = true;
        speakBtn.classList.add('listening');
        speakBtn.disabled = true;
        statusEl.textContent = 'Escuchando...';
        feedbackEl.className = 'feedback';
        feedbackEl.textContent = '';

        recog.onresult = function(e) {
            state.listening = false;
            speakBtn.classList.remove('listening');
            speakBtn.disabled = false;
            var transcript = e.results[0][0].transcript;
            var confidence = e.results[0][0].confidence;
            evaluate(transcript, state.currentWord, confidence);
        };

        recog.onerror = function(e) {
            state.listening = false;
            speakBtn.classList.remove('listening');
            speakBtn.disabled = false;
            statusEl.textContent = '';
            var msg = 'Error de reconocimiento.';
            switch (e.error) {
                case 'no-speech':
                    msg = 'No se detecto voz.';
                    break;
                case 'not-allowed':
                    msg = 'Permiso denegado.';
                    modal.classList.remove('hidden');
                    break;
                case 'aborted':
                    return;
                default:
                    msg = 'Error: ' + e.error;
            }
            feedbackEl.className = 'feedback incorrect';
            feedbackEl.textContent = msg;
        };

        recog.onend = function() {
            if (state.listening) {
                state.listening = false;
                speakBtn.classList.remove('listening');
                speakBtn.disabled = false;
                statusEl.textContent = 'No se detecto voz. Intenta de nuevo.';
            }
        };

        try { recog.start(); } catch (e) {
            state.listening = false;
            speakBtn.classList.remove('listening');
            speakBtn.disabled = false;
            statusEl.textContent = 'Error al iniciar microfono.';
        }
    }

    /* ========== 8. EVALUACION ========== */
    function clean(s) {
        return s.toLowerCase().trim().replace(/[^a-z]/g, '');
    }

    function evaluate(spoken, expected, confidence) {
        var cs = clean(spoken);
        var ce = clean(expected);
        var correct = cs === ce ||
            cs.replace(/^(the|a|an)\s*/, '') === ce.replace(/^(the|a|an)\s*/, '') ||
            cs.indexOf(ce) !== -1 || ce.indexOf(cs) !== -1;

        if (correct) {
            state.score += 10;
            state.correct++;
            feedbackEl.className = 'feedback correct';
            feedbackEl.textContent = 'CORRECTO! +10 puntos';
            setTimeout(function() { speakWord(state.currentWord); }, 800);
        } else {
            state.incorrect++;
            feedbackEl.className = 'feedback incorrect';
            feedbackEl.textContent = 'INCORRECTO. Dijiste: "' +
                spoken + '". Era: "' + expected + '"';
        }
        statusEl.textContent = (confidence !== undefined) ?
            'Confianza: ' + Math.round(confidence * 100) + '%' : '';
        updateScore();
    }

    function updateScore() {
        scoreEl.textContent = state.score;
        correctEl.textContent = state.correct;
        incorrectEl.textContent = state.incorrect;
    }

    /* ========== 9. EVENTOS ========== */
    spinBtn.addEventListener('click', spin);

    wheelGroup.addEventListener('transitionend', function(e) {
        if (e.propertyName === 'transform') onSpinStop();
    });

    listenBtn.addEventListener('click', function() {
        if (state.currentWord) {
            speakWord(state.currentWord);
            statusEl.textContent = 'Reproduciendo...';
            setTimeout(function() {
                statusEl.textContent = 'Presiona "Pronunciar" y repite la palabra';
            }, 1500);
        }
    });

    speakBtn.addEventListener('click', startRecognition);

    modalBtn.addEventListener('click', function() {
        modal.classList.add('hidden');
        try {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function(s) {
                    s.getTracks().forEach(function(t) { t.stop(); });
                    statusEl.textContent = 'Microfono listo!';
                })
                .catch(function() {
                    statusEl.textContent = 'No se pudo acceder al microfono.';
                });
        } catch (e) {
            statusEl.textContent = 'Error: getUserMedia no disponible.';
        }
    });

    /* ========== 10. INICIALIZACION ========== */
    createWheel();
    updateScore();

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
        statusEl.textContent = 'Listo! Gira la ruleta para empezar.';
    } else {
        statusEl.textContent = 'ADVERTENCIA: Usa Chrome para reconocimiento de voz.';
        speakBtn.disabled = true;
    }

})();
