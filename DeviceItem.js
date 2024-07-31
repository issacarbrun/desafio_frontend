import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosService from '../../services/axiosService';
import { CSVLink } from 'react-csv';
import {
    CCard,
    CCardBody,
    CCol,
    CRow,
    CCardHeader,
    CCardTitle,
    CCardText,
    CFormSelect,
    CSpinner
} from '@coreui/react';

import {
    CDateRangePicker
} from '@coreui/react-pro'

import "react-datepicker/dist/react-datepicker.css";
import '@coreui/coreui-pro/dist/css/coreui.min.css'

import { cilCloudDownload } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import VariableChart from './VariableChart';

const sensors = {
    temperature: { type: '1', grandeza: '°C', name: 'Temperatura' },
    humidity: { type: '2', grandeza: '%', name: 'Umidade' },
    io: { type: '3', grandeza: 'on/off', name: 'IO' },
    energy_consumption: { type: '4', grandeza: 'kW', name: 'Consumo de energia' },
    energy_status: { type: '5', grandeza: 'on/off', name: 'Status de energia' },
    altitude: { type: '6', grandeza: 'm', name: 'Altitude' },
    wind_speed: { type: '7', grandeza: 'km/h', name: 'Velocidade do vento' },
    pressure: { type: '8', grandeza: 'hPa', name: 'Pressão' },
    wind_direction: { type: '9', grandeza: '°Graus', name: 'Direção do vento' },
    rain_gauge: { type: '10', grandeza: 'mm', name: 'Pluviometro' },
    vibration: { type: '11', grandeza: 'Hz', name: 'Vibração' },
    input_voltage: { type: '12', grandeza: 'V', name: 'Tensão de entrada' },
    bat_voltage: { type: '13', grandeza: 'V', name: 'Tensão da bateria' },
    current: {type: '14', grandeza: 'A', name: 'Corrente'},
    horimeter: {type: '15', grandeza: 'h', name: 'Tempo de máquina'}
};



const DeviceItem = () => {
    const { id } = useParams();
    const [deviceData, setDeviceData] = useState(null);
    const [deviceSensor, setDeviceSensor] = useState(null);
    const [deviceName, setDeviceName] = useState('');
    const [devicePhysicalId, setDevicePhysicalId] = useState('');
    const [timeRange, setTimeRange] = useState('30d');
    const [updateTime, setUpdateTime] = useState('');
    const [loading, setLoading] = useState(true);

    const timeRangeLabel = {
        '30min': 'últimos 30 minutos',
        '1h': 'última hora',
        '6h': 'últimas 6 horas',
        '24h': 'últimas 24 horas',
        '7d': 'últimos 7 dias',
        '30d': 'últimos 30 dias',
        '6m': 'últimos 6 meses',
        '1y': 'último ano'
    }[timeRange] || 'Selecionar intervalo';

    useEffect(() => {
        // Função para buscar os dados do dispositivo
        const fetchDeviceData = async () => {
            try {
                const response = await axiosService.get(`${import.meta.env.VITE_API_URL}/device/${id}`);
                if (response && response.resultado && response.device) {
                    console.log(response);
                    setDeviceData(response.device.data);
                    setDeviceName(response.device.name);
                    setDeviceSensor(response.device.sensor);
                    setLoading(false);

                    setDevicePhysicalId(response.device.id_physical);
                } else {
                    console.error('Error fetching device data: Data structure is not as expected.');
                }
            } catch (error) {
                console.error('Error fetching device data:', error);
            }
        };

        // Chama fetchDeviceData uma vez ao carregar a página
        fetchDeviceData();

        // Define um intervalo para atualizar os dados com base no updateTime
        const intervalId = setInterval(() => {
            if (updateTime) {
                fetchDeviceData();
            }
        }, updateTime * 1000);

        return () => clearInterval(intervalId); // Limpa o intervalo ao desmontar o componente
    }, [id, updateTime]);

    const transformData = (data) => {
        const transformed = {
            temperature: [],
            humidity: [],
            io: [],
            energy_consumption: [],
            energy_status: [],
            altitude: [],
            wind_speed: [],
            pressure: [],
            wind_direction: [],
            rain_gauge: [],
            vibration: [],
            input_voltage: [],
            bat_voltage: [],
        };
    
        data.forEach(record => {
            Object.keys(record.data).forEach(key => {
                if (key !== 'id' && key !== 'temperature') {
                    if (!transformed[key]) {
                        transformed[key] = [];
                    }
                    transformed[key].push({
                        value: record.data[key],
                        created_at: record.created_at
                    });
                } else if (key === 'temperature') {
                    record.data.temperature.forEach(tempRecord => {
                        if (!transformed.temperature[tempRecord.id]) {
                            transformed.temperature[tempRecord.id] = [];
                        }
                        transformed.temperature[tempRecord.id].push({
                            value: tempRecord.temperature,
                            created_at: record.created_at
                        });
                    });
                }
            });
        });
 
        return transformed;
    };

    const generateCSV = () => {
        if (!deviceData) return [];

        const transformedData = transformData(deviceData);

        // Extraindo os sensores de temperatura de transformedData
        const temperatureSensors = transformedData.temperature || {};
        const nonTemperatureSensors = Object.keys(transformedData).filter(key => key !== 'temperature');

        // Gerando os cabeçalhos
        const headers = ["Created_at", ...nonTemperatureSensors, ...Object.keys(temperatureSensors).map(sensorId => `temperature_${sensorId}`)];
        const csvData = [];

        // Coletando todos os timestamps únicos
        const timestamps = [...new Set(
            Object.values(transformedData).flat().map(item => item?.created_at).filter(Boolean)
        )];

        timestamps.forEach(timestamp => {
            const row = { Created_at: timestamp };

            // Adicionando dados dos sensores não relacionados a temperatura
            nonTemperatureSensors.forEach(header => {
                const entry = transformedData[header]?.find(item => item?.created_at === timestamp);
                row[header] = entry ? entry.value : '';
            });

            // Adicionando dados dos sensores de temperatura
            Object.keys(temperatureSensors).forEach(sensorId => {
                const entry = temperatureSensors[sensorId]?.find(item => item?.created_at === timestamp);
                row[`temperature_${sensorId}`] = entry ? entry.value : '';
            });

            csvData.push(row);
        });

        return [headers, ...csvData.map(row => headers.map(header => row[header]))];
    };

    const calculateEnergyAndCurrent = (formattedData) => {
        const energyData = formattedData['energy_consumption'] || [];
        const currentData = formattedData['current'] || [];
    
        if (energyData.length === 0 || currentData.length === 0) {
            return { totalEnergy: 0, avgCurrent: 0 };
        }
    
        // Get the start and end dates from the filtered data
        const startDate = parseDate(energyData[energyData.length - 1].created_at);
        const endDate = parseDate(energyData[0].created_at);
        // Calculate the difference in hours
        const timeDifferenceInHours = (endDate - startDate) / (1000 * 60 * 60);
    
        let sumEnergy = 0;
        let totalCurrent = 0;
        let sum = 0;
    
        // Sum up the values
        energyData.forEach((energyEntry) => {
            sumEnergy += parseFloat(energyEntry.value) / 60 ;
            sum += parseFloat(energyEntry.value)
        });
    
        currentData.forEach((currentEntry) => {
            totalCurrent += parseFloat(currentEntry.value);
        });
    
        // Calculate averages
        const avgEnergy = sumEnergy; // Total energy divided by the time period in hours
        const avgCurrent = totalCurrent / currentData.length; // Average current over the number of data points
    
        return { totalEnergy: avgEnergy, avgCurrent };
    };
    
    
    
    const parseDate = (dateString) => {
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        const timezoneOffset = new Date().getTimezoneOffset() / 60; // offset em horas
        return new Date(year, month - 1, day, hours - timezoneOffset, minutes, seconds);
    };

    const formatDate = (date) => {
        const utcDate = new Date(date.getTime()); // Ajuste para UTC-3
        const day = String(utcDate.getDate()).padStart(2, '0');
        const month = String(utcDate.getMonth() + 1).padStart(2, '0'); // +1 porque getMonth() retorna de 0 a 11
        const year = utcDate.getFullYear();
        const hours = String(utcDate.getHours()).padStart(2, '0');
        const minutes = String(utcDate.getMinutes()).padStart(2, '0');
        const seconds = String(utcDate.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    const filterDataByRange = (data, range) => {
        if (!data || data.length === 0) return { timeRange: null, deviceData: [] };
    
        const sortedData = data.sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));
        const mostRecentRecord = sortedData[0];
        const endDate = parseDate(mostRecentRecord.created_at);
        let startDate;
    
        switch (range) {
            case '30min':
                startDate = new Date(endDate.getTime() - 30 * 60 * 1000); // 30 minutos atrás
                break;
            case '1h':
                startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // 1 hora atrás
                break;
            case '6h':
                startDate = new Date(endDate.getTime() - 6 * 60 * 60 * 1000); // 6 horas atrás
                break;
            case '24h':
                startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 horas atrás
                break;
            case '7d':
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás
                break;
            case '30d':
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
                break;
            case '6m':
                startDate = new Date(endDate.getTime() - 6 * 30 * 24 * 60 * 60 * 1000); // 6 meses atrás
                break;
            case '1y':
                startDate = new Date(endDate.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // 1 ano atrás
                break;
            default:
                return { timeRange: null, deviceData: [] };
        }
    
        const filteredDeviceData = data.filter(record => {
            const recordDate = parseDate(record.created_at);
            return recordDate >= startDate && recordDate <= endDate;
        });
    
        return { timeRange: { start: startDate, end: endDate }, deviceData: filteredDeviceData };
    };
    

    const filteredData = deviceData ? filterDataByRange(deviceData, timeRange) : { timeRange: null, deviceData: [] };
    const transformedData = deviceData ? transformData(filteredData.deviceData) : {};
    const { totalEnergy, avgCurrent } = calculateEnergyAndCurrent(transformedData, timeRange);

    if (loading) {
        return (
            <CCard className="text-center">
                <CCardBody>
                    <CSpinner />
                    <CCardTitle>Carregando dispositivos...</CCardTitle>
                </CCardBody>
            </CCard>
        );
    }

    return (
        <>
            <CRow>
                <CCol sm={5}>
                    <h4 id="traffic" className="card-title mb-0">
                        {deviceName}
                    </h4>
                    <div className="small text-body-secondary">ID: {devicePhysicalId}</div>
                </CCol>
                <CCol sm={4} className="d-none d-md-block">
                    <CSVLink
                        data={generateCSV()}
                        filename={`${deviceName}_data.csv`}
                        className="btn btn-primary float-end"
                        target="_blank"
                    >
                        <CIcon icon={cilCloudDownload} />
                        {' '}
                        Download CSV
                    </CSVLink>
                </CCol>
                <CCol sm={2} >
                    <CFormSelect
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                    >
                        <option value=""></option>
                        <option value="30min">30m</option>
                        <option value="1h">1h</option>
                        <option value="6h">6h</option>
                        <option value="24h">24h</option>
                        <option value="7d">7d</option>
                        <option value="30d">30d</option>
                        <option value="6m">6m</option>
                        <option value="1y">1a</option>
                    </CFormSelect>
                </CCol>
                <CCol sm={1}>
                    <CFormSelect
                        size="SM" className="mb-1"
                        value={updateTime} // Valor selecionado do select
                        onChange={(e) => setUpdateTime(parseInt(e.target.value))}
                    >
                        <option value=""></option>
                        <option value="5">5s</option>
                        <option value="10">10s</option>
                        <option value="15">15s</option>
                    </CFormSelect>
                </CCol>
            </CRow>
            <CRow>
                {Object.keys(transformedData).filter(key => key !== 'id' && key !== 'temperature' && transformedData[key].length > 0).map(key => {
                    // Encontrando o último dado transmitido
                    const lastData = deviceData && deviceData.length > 0
                        ? deviceData[0].data[key]
                        : null;
                    const formattedLastData = lastData !== null
                        ? parseFloat(lastData).toFixed(2)
                        : null;
                    // Encontrando a última transmissão
                    const lastTransmission = deviceData && deviceData.length > 0
                        ? deviceData[0].created_at
                        : null;

                    // Obter o nome, a grandeza e o tipo do sensor a partir do objeto sensors
                    const sensorInfo = sensors[key] || {};
                    const sensorName = sensorInfo.name || key.charAt(0).toUpperCase() + key.slice(1);
                    const sensorGrandeza = sensorInfo.grandeza || '';
                    const sensorType = sensorInfo.type || '';
                    const sensor = deviceSensor.find(sensor => sensor.type.toString() === sensorType);

                    // Encontrar a descrição do sensor no array deviceSensor
                    const sensorDescription = sensor ? sensor.description : 'Equipamento';
                    const { totalEnergy, avgCurrent } = calculateEnergyAndCurrent(transformedData);

                    return (
                        <CCol xs="12" sm="6" md="4" lg="3" key={key}>
                            <CCard>
                                <CCardBody>
                                    <CCardTitle>{sensorName}</CCardTitle>
                                    <CCardText>{formattedLastData} {sensorGrandeza}</CCardText>
                                    <CCardText>Descrição: {sensorDescription}</CCardText>
                                    <CCardText>Última Transmissão: {lastTransmission ? formatDate(parseDate(lastTransmission)) : 'N/A'}</CCardText>
                                </CCardBody>
                            </CCard>
                        </CCol>
                    );
                })}
            </CRow>
            {transformedData.energy_consumption && transformedData.energy_consumption.length > 0 && (
            <CRow className='mt-4'>
                <CCol xs="12">
                    <CCard>
                        <CCardBody>
                            <CCardTitle>Energia Total Consumida nos {timeRangeLabel}</CCardTitle>
                            <CCardText>{totalEnergy.toFixed(2)} kWh</CCardText>
                            <CCardText>Custo aproximado: R${(totalEnergy.toFixed(2)*0.59296).toFixed(2)}</CCardText>
                        </CCardBody>
                    </CCard>
                </CCol>               
            </CRow>
            )}
            <CRow className='mt-4'>
            {Object.keys(transformedData)
            .filter(key => key !== 'id' && key !== 'temperature' && key !== 'horimeter' && transformedData[key].length > 0)
            .map(key => {
                const sensorInfo = sensors[key] || {};
                const sensorName = sensorInfo.name || key.charAt(0).toUpperCase() + key.slice(1);
                const sensorGrandeza = sensorInfo.grandeza || '';

                return (
                    <CCol xs="6" key={key}>
                        <CCard className="mb-4">
                        <CCardHeader>{sensorName} ({sensorGrandeza})</CCardHeader>
                        <CCardBody>
                        <VariableChart deviceData={transformedData[key].slice().reverse().map(entry => ({
                            created_at: formatDate(parseDate(entry.created_at)),
                            value: entry.value
                        }))}                                         
                        variableLabel={`${sensorName} (${sensorGrandeza})`}
                        sensorMin={parseFloat(sensorInfo?.min)}
                        sensorMax={parseFloat(sensorInfo?.max)} />
                        </CCardBody>
                        </CCard>

                    </CCol>
                );
            })}
            </CRow>
            <CRow className='mt-4'>
                {transformedData.temperature && Object.keys(transformedData.temperature).map(sensorId => {
                    // Encontrar o último dado transmitido para o sensor de temperatura
                    const lastTemperatureData = transformedData.temperature[sensorId][0];
                    const formattedLastTemperatureData = lastTemperatureData
                        ? parseFloat(lastTemperatureData.value).toFixed(2)
                        : null;

                    // Encontrar a última transmissão para o sensor de temperatura
                    const lastTemperatureTransmission = lastTemperatureData
                        ? lastTemperatureData.created_at
                        : null;

                    // Obter o nome e a grandeza do sensor a partir do objeto sensors
                    const sensorName = `Sensor ${sensorId}`;
                    const sensorGrandeza = '°C';

                    // Encontrar informações específicas do sensor, como min e max
                    const sensorInfo = deviceSensor.find(sensor => sensor.id_sensor_type.toString() === sensorId);

                    return (

                        <CCol xs="12" sm="6" md="4" lg="3" key={`temperature_${sensorId}`}>
                            <CCard>
                                <CCardBody>
                                    <CCardTitle>{sensorName}</CCardTitle>
                                    <CCardText>{formattedLastTemperatureData} {sensorGrandeza}</CCardText>
                                    <CCardText>Descrição: {sensorInfo ? sensorInfo.description : 'Sensor de Temperatura'}</CCardText>
                                    <CCardText>Última Transmissão: {lastTemperatureTransmission ? formatDate(parseDate(lastTemperatureTransmission)) : 'N/A'}</CCardText>
                                </CCardBody>
                            </CCard>
                        </CCol>
                    );
                })}
            </CRow>

            <CRow className='mt-4'>
                {transformedData.temperature && Object.keys(transformedData.temperature).map(sensorId => {
                    // Obter o nome e a grandeza do sensor a partir do objeto sensors
                    const sensorName = `Sensor de temperatura ${sensorId}`;
                    const sensorGrandeza = '°C';

                    // Encontrar informações específicas do sensor, como min e max
                    const sensorInfo = deviceSensor.find(sensor => sensor.id_sensor_type.toString() === sensorId);

                    return (
                        <CCol xs={6} key={sensorId}>
                            <CCard className="mb-4">
                                <CCardHeader>{sensorName} ({sensorGrandeza})</CCardHeader>
                                <CCardBody>
                                    <VariableChart
                                        deviceData={transformedData.temperature[sensorId].slice().reverse().map(entry => ({
                                            created_at: formatDate(parseDate(entry.created_at)),
                                            value: entry.value
                                        }))}
                                        variableLabel={`${sensorName} (${sensorGrandeza})`}
                                        sensorMin={parseFloat(sensorInfo?.min)}
                                        sensorMax={parseFloat(sensorInfo?.max)}
                                    />
                                </CCardBody>
                            </CCard>
                        </CCol>
                    );
                })}
            </CRow>
        </>
    );

};

export default DeviceItem;
