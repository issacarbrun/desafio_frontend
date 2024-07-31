import React, { useEffect, useRef } from 'react';
import { CChart } from '@coreui/react-chartjs';
import { getStyle } from '@coreui/utils';

const VariableChart = ({ deviceData, variableLabel }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        document.documentElement.addEventListener('ColorSchemeChange', () => {
            if (chartRef.current) {
                setTimeout(() => {
                    chartRef.current.update();
                });
            }
        });
    }, [chartRef]);

    const variableData = deviceData.map((data) => data.value);
    const labels = deviceData.map((data) => data.created_at);

    const filledData = fillMissingData(labels, variableData);

    // Calcular o valor mínimo e máximo dos dados
    let minValue, maxValue;

    if (variableLabel === 'Tensão da bateria (V)') {
        minValue = Math.min(...filledData) - 1;
        maxValue = Math.max(...filledData) + 1;
    } else if (variableLabel === 'Status de energia (on/off)') {
        minValue = null;
        maxValue = null;
    } else {
        minValue = Math.min(...filledData) - 0;
        maxValue = Math.max(...filledData) + 0.5;
    }

    const chartData = {
        labels: labels,
        datasets: [
            {
                label: variableLabel,
                backgroundColor: `rgba(${getStyle('--cui-info-rgb')}, .1)`,
                borderColor: getStyle('--cui-info'),
                //pointHoverBackgroundColor: getStyle('--cui-info'),
                borderWidth: 2,
                data: filledData,
                fill: true,
                pointBackgroundColor: '#007bff', // Cor de preenchimento das bolinhas
                pointBorderColor: '#007bff', // Cor da borda das bolinhas
                pointRadius: 2, // Raio das bolinhas
                pointHoverRadius: 2, // Raio das bolinhas no hover
            },
            
        ],
    };

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            x: {
                grid: {
                    color: getStyle('--cui-border-color-translucent'),
                    drawOnChartArea: false,
                },
                ticks: {
                    color: getStyle('--cui-body-color'),
                    maxRotation: 90, // Rotação máxima das labels
                    minRotation: 90,
                    autoSkip: true, // Habilitar pular automaticamente
                    maxTicksLimit: 5, // Limite máximo de ticks
                },
            },
            y: {
                beginAtZero: false,
                min: minValue,
                max: maxValue,
                border: {
                    color: getStyle('--cui-border-color-translucent'),
                },
                grid: {
                    color: getStyle('--cui-border-color-translucent'),
                },
            },
        },
    };

    return (
        <CChart
            type="line"
            ref={chartRef}
            style={{ height: '300px', marginTop: '40px' }}
            data={chartData}
            options={chartOptions}
        />
    );
};

function fillMissingData(labels, data) {
    const filledData = [];
    let lastValue = null;

    labels.forEach((label, index) => {
        const currentValue = data[index];
        if (currentValue !== undefined) {
            filledData.push(currentValue);
            lastValue = currentValue;
        } else if (lastValue !== null) {
            filledData.push(lastValue);
        } else {
            filledData.push(null);
        }
    });

    return filledData;
}

export default VariableChart;
