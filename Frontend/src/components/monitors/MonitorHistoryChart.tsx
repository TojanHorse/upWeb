import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface MonitorHistoryChartProps {
  data: {
    dates: string[];
    responseTimes: number[];
    statuses: ('good' | 'warning' | 'error')[];
  };
  title?: string;
}

const MonitorHistoryChart: React.FC<MonitorHistoryChartProps> = ({ data, title }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: {
          size: 13,
        },
        bodyFont: {
          size: 12,
        },
        padding: 12,
        borderColor: 'rgba(31, 41, 55, 0.8)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `Response time: ${context.raw} ms`;
          },
          labelPointStyle: function() {
            return {
              pointStyle: 'circle',
              rotation: 0
            };
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)',
          font: {
            size: 10,
          },
          maxRotation: 0,
          maxTicksLimit: 7,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)',
          font: {
            size: 10,
          },
          stepSize: 100,
        },
        title: {
          display: true,
          text: 'Response Time (ms)',
          color: 'rgba(156, 163, 175, 0.8)',
          font: {
            size: 10,
            weight: 'normal',
          },
        },
      },
    },
    elements: {
      line: {
        tension: 0.3,
      },
      point: {
        radius: 3,
        hoverRadius: 5,
      },
    },
  };

  // Create point background colors based on status
  const pointBackgroundColors = data.statuses.map(status => {
    if (status === 'good') return '#10B981';
    if (status === 'warning') return '#F59E0B';
    return '#EF4444';
  });

  const chartData = {
    labels: data.dates,
    datasets: [
      {
        label: 'Response Time',
        data: data.responseTimes,
        borderColor: 'rgba(6, 182, 212, 0.8)',
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        fill: 'start',
        pointBackgroundColor: pointBackgroundColors,
        pointBorderColor: 'rgba(255, 255, 255, 0.8)',
        pointHoverBackgroundColor: pointBackgroundColors,
        pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
      },
    ],
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="card h-full"
    >
      {title && <h3 className="text-base font-medium mb-4">{title}</h3>}
      <div className="h-60">
        <Line options={options} data={chartData} />
      </div>
    </motion.div>
  );
};

export default MonitorHistoryChart;