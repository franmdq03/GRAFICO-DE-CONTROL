let controlChart; // Variable global para almacenar la instancia del gráfico

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('selectorCaso').addEventListener('change', function () {
        const caseNumber = this.value;
        fetchData(caseNumber);
    });

    // Inicializar la página con un mensaje por defecto
    mostrarMensajeInicial();
});

// Función para mostrar un mensaje inicial en caso de que no se haya seleccionado un caso
function mostrarMensajeInicial() {
    const alertasDiv = document.getElementById('alertas');
    alertasDiv.innerHTML = '<p>Seleccione un caso para mostrar el gráfico.</p>';
}

// Función para obtener los datos desde la API
function fetchData(caseNumber) {
    const apiUrl = `https://apidemo.geoeducacion.com.ar/api/testing/control/${caseNumber}`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const valores = data.data[0].valores.map(item => item.y);
                const etiquetas = data.data[0].valores.map(item => item.x);
                const media = data.data[0].media;
                const lsc = data.data[0].lsc;
                const lic = data.data[0].lic;

                mostrarGrafico(valores, etiquetas, media, lsc, lic);
                alertas(valores, media, lsc, lic);
            } else {
                console.error("Error en la respuesta de la API:", data.messages);
                mostrarMensajeError();
            }
        })
        .catch(error => {
            console.error('Error al obtener los datos:', error);
            mostrarMensajeError();
        });
}

// Función para mostrar un mensaje de error en caso de fallo en la API
function mostrarMensajeError() {
    const alertasDiv = document.getElementById('alertas');
    alertasDiv.innerHTML = '<p>Error al obtener los datos de la API. Por favor, intente nuevamente.</p>';
}

// Función para mostrar el gráfico usando Chart.js
function mostrarGrafico(valores, etiquetas, media, lsc, lic) {
    const ctx = document.getElementById('controlChart').getContext('2d');

    if (controlChart) {
        controlChart.destroy();
    }

    // Crear un nuevo gráfico
    controlChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [
                {
                    label: 'Valores',
                    data: valores,
                    borderColor: 'blue',
                    fill: false
                },
                {
                    label: 'Media',
                    data: new Array(valores.length).fill(media),
                    borderColor: 'green',
                    borderDash: [5, 5],
                    fill: false
                },
                {
                    label: 'LSC (Límite Superior)',
                    data: new Array(valores.length).fill(lsc),
                    borderColor: 'red',
                    borderDash: [5, 5],
                    fill: false
                },
                {
                    label: 'LIC (Límite Inferior)',
                    data: new Array(valores.length).fill(lic),
                    borderColor: 'red',
                    borderDash: [5, 5],
                    fill: false
                }
            ]
        }
    });
}

// Funcion para detectar reglas de control y generar alertas
function alertas(valores, media, lsc, lic) {
    const sigma = calcularSigma(valores, media);
    const sigma1 = sigma;
    const sigma2 = 2 * sigma;

    let alertasArray = [];

    // Regla 1: Puntos fuera de los límites de control (LSC o LIC)
    valores.forEach((valor, index) => {
        if (valor > lsc || valor < lic) {
            alertasArray.push(`Punto ${index + 1} fuera de control: Valor = ${valor}`);
        }
    });

    // Regla 2: Dos de tres puntos consecutivos fuera de Sigma2
    for (let i = 2; i < valores.length; i++) {
        const consecutivos = [valores[i - 2], valores[i - 1], valores[i]];
        const fueraDeSigma2 = consecutivos.filter(val => Math.abs(val - media) > sigma2).length;
        if (fueraDeSigma2 >= 2) {
            alertasArray.push(`Tendencia en los puntos ${i - 1}, ${i}, ${i + 1} fuera de Sigma2`);
        }
    }

    // Regla 3: Cuatro de cinco puntos consecutivos fuera de Sigma1
    for (let i = 4; i < valores.length; i++) {
        const consecutivos = [valores[i - 4], valores[i - 3], valores[i - 2], valores[i - 1], valores[i]];
        const fueraDeSigma1 = consecutivos.filter(val => Math.abs(val - media) > sigma1).length;
        if (fueraDeSigma1 >= 4) {
            alertasArray.push(`Tendencia en los puntos ${i - 3} a ${i + 1} fuera de Sigma1`);
        }
    }

    // Regla 4: Ocho puntos consecutivos del mismo lado de la media
    let contadorMismoLado = 0;
    let ladoActual = null;
    for (let i = 0; i < valores.length; i++) {
        const lado = valores[i] > media ? 'arriba' : 'abajo';
        if (lado === ladoActual) {
            contadorMismoLado++;
        } else {
            contadorMismoLado = 1;
            ladoActual = lado;
        }
        if (contadorMismoLado >= 8) {
            alertasArray.push(`Ocho puntos consecutivos del mismo lado de la media desde el punto ${i - 7} al ${i}`);
        }
    }

    mostrarAlertas(alertasArray);
}

// Funcion para mostrar las alertas en el HTML
function mostrarAlertas(alertasArray) {
    const alertasDiv = document.getElementById('alertas');
    alertasDiv.innerHTML = '';

    if (alertasArray.length === 0) {
        alertasDiv.innerHTML = '<p>No se encontraron anomalías.</p>';
    } else {
        alertasArray.forEach(alerta => {
            const p = document.createElement('p');
            p.textContent = alerta;
            alertasDiv.appendChild(p);
        });
    }
}

// Funcion auxiliar para calcular sigma (desviacion estandar)
function calcularSigma(valores, media) {
    const sumaDiferenciasCuadradas = valores.reduce((acumulador, valor) => {
        return acumulador + Math.pow(valor - media, 2);
    }, 0);

    const varianza = sumaDiferenciasCuadradas / valores.length;
    const sigma = Math.sqrt(varianza);

    return sigma;
}
