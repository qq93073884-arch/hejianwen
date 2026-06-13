import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Ably from 'ably';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import html2canvas from 'html2canvas';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  Info,
  BarChart2,
  Crosshair,
  ShieldAlert,
  Target,
  Zap,
  X,
  TrendingUp,
  Maximize2,
  Globe,
  Calculator,
  Radio,
  History,
  Layers,
  Bitcoin,
  Radar,
  Rocket,
  Send,
  MessageSquare,
  Sparkles,
  Brain,
  Camera,
  Download,
  Flame,
  Bell,
  BellRing,
  AlertTriangle
} from 'lucide-react';

// ==========================================
// 🚀 ABLY 弹幕系统配置
// ==========================================
const ABLY_API_KEY = import.meta.env.VITE_ABLY_API_KEY || '';

const DEFAULT_COINS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 
  'DOGEUSDT', 'ORDIUSDT', 'LINKUSDT', 'AVAXUSDT', 
  'NEARUSDT', 'RENDERUSDT', 'PEPEUSDT', 'WIFUSDT'
];

const HIP3_DEXES = ['xyz', 'flx', 'vntl', 'hyna', 'km', 'cash'];

const ZH_NAMES = {
  'CCI': '全息加密大盘指数',
  'BTC': '比特币', 'ETH': '以太坊', 'SOL': '索拉纳', 'BNB': '币安币', 'DOGE': '狗狗币', 
  'ORDI': '奥迪', 'WIF': '狗帽币', 'PEPE': '佩佩蛙', 'LINK': '链环', 'SUI': 'Sui', 
  'APT': 'Aptos', 'ARB': 'Arbitrum', 'OP': 'Optimism',
  'GOLD': '黄金', 'SILVER': '白银', 'COPPER': '铜', 'GAS': '天然气',
  'WTIOIL': 'WTI原油', 'BRENTOIL': '布伦特原油', 'CL': 'WTI原油(旧码)',
  'NDX': '纳斯达克100', 'S&P500': '标普500指数', 'USA500': '美国500', 
  'DJI': '道琼斯指数', 'XYZ100': 'XYZ100指数', 'SPX': '标普500(旧码)', 'NQ': '纳斯达克(旧码)',
  'RUT': '罗素2000', 'VIX': '恐慌指数',
  'NVDA': '英伟达', 'AAPL': '苹果', 'MSFT': '微软', 'TSLA': '特斯拉', 'MSTR': '微策略', 
  'COIN': 'Coinbase', 'AMZN': '亚马逊', 'GOOGL': '谷歌', 'META': 'Meta(脸书)', 
  'CRCL': 'Circle(USDC母公司)', 'ARM': 'ARM控股', 'SMCI': '超微电脑', 'GME': '游戏驿站', 'AMC': 'AMC院线',
  'EURUSD': '欧元/美元', 'USDJPY': '美元/日元', 'GBPUSD': '英镑/美元', 
  'AUDUSD': '澳元/美元', 'USDCAD': '美元/加元', 'DXY': '美元指数'
};

let hlDictionary = {};
let globalAssetList = [];
let isGlobalDataLoaded = false;

const initGlobalData = async () => {
  if (isGlobalDataLoaded) return;
  try {
    fetch('https://api.binance.com/api/v3/exchangeInfo').then(res=>res.json()).then(data=>{
      if(data && data.symbols) {
        data.symbols.forEach(s => {
          if(s.quoteAsset === 'USDT' && s.status === 'TRADING') {
            const pure = s.symbol.replace('USDT', '');
            globalAssetList.push({ id: s.symbol, name: s.symbol, zhName: ZH_NAMES[pure] || '', badge: '🌕 币安正规军' });
          }
        });
      }
    }).catch(()=>{});

    const [metaRes, spotMetaRes] = await Promise.all([
      fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "meta" }) }).catch(()=>null),
      fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "spotMeta" }) }).catch(()=>null)
    ]);

    if (metaRes && metaRes.ok) {
      const meta = await metaRes.json();
      meta.universe.forEach(asset => {
        const name = asset.name; 
        hlDictionary[name.toUpperCase()] = name;
        hlDictionary[`${name.toUpperCase()}USDT`] = name;
        hlDictionary[`${name.toUpperCase()}USDC`] = name;
        globalAssetList.push({ id: `HL:${name}`, name: name, zhName: ZH_NAMES[name.toUpperCase()] || '', badge: '🟣 HL 官方合约' });
      });
    }

    if (spotMetaRes && spotMetaRes.ok) {
      const spotMeta = await spotMetaRes.json();
      spotMeta.universe.forEach(asset => {
        const name = asset.name; 
        const base = name.split('/')[0]; 
        hlDictionary[base.toUpperCase()] = name;
        hlDictionary[`${base.toUpperCase()}USDT`] = name;
        hlDictionary[`${base.toUpperCase()}USDC`] = name;
        hlDictionary[name.toUpperCase()] = name;
        hlDictionary[name.toUpperCase().replace('/', '')] = name; 
        globalAssetList.push({ id: `HL:${name}`, name: name, zhName: ZH_NAMES[base.toUpperCase()] || '', badge: '🟡 HL 官方现货' });
      });
    }
    
    const hip3Promises = HIP3_DEXES.map(dex =>
      fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "meta", dex }) })
      .then(res => res.ok ? res.json().then(data => ({dex, data})) : null).catch(()=>null)
    );
    const hip3Results = await Promise.all(hip3Promises);
    hip3Results.forEach(res => {
      if (res && res.data && res.data.universe) {
        res.data.universe.forEach(asset => {
          const fullName = asset.name; 
          hlDictionary[asset.name.toUpperCase()] = fullName; 
          const pureName = asset.name.includes(':') ? asset.name.split(':')[1] : asset.name;
          if (!hlDictionary[pureName.toUpperCase()]) {
             hlDictionary[pureName.toUpperCase()] = fullName; 
          }
          globalAssetList.push({ id: `HL:${fullName}`, name: fullName, zhName: ZH_NAMES[pureName.toUpperCase()] || '', badge: `🟢 HL-${res.dex.toUpperCase()} 池` });
        });
      }
    });

    isGlobalDataLoaded = true;
  } catch (err) {}
};

const safeFetch = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status === 418) {
        const retryAfter = res.headers.get('Retry-After') || 3;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

const hlFetchKlines = async (coin, interval, limit) => {
  try {
    const intervalMap = { '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };
    const startTime = Date.now() - limit * intervalMap[interval];
    const res = await fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "candleSnapshot", req: { coin, interval, startTime } }) });
    if (!res.ok) return null; 
    const data = await res.json();
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data.map(k => [k.t, k.o, k.h, k.l, k.c, k.v, k.T, "0", 0, (parseFloat(k.v) * 0.5).toString(), "0", "0"]);
  } catch (err) { return null; }
};

const getAssetCategory = (symbol) => {
  const s = symbol.toUpperCase();
  if (['NDX', 'SPX', 'S&P500', 'USA500', 'DJI', 'XYZ100', 'RUT', 'VIX', 'NVDA', 'AAPL', 'MSFT', 'TSLA', 'MSTR', 'COIN', 'AMZN', 'GOOGL', 'META', 'CRCL', 'ARM', 'SMCI', 'GME', 'AMC'].some(x => s.includes(x))) return 'equity';
  if (['GOLD', 'SILVER', 'COPPER', 'GAS', 'WTIOIL', 'BRENTOIL', 'CL'].some(x => s.includes(x))) return 'commodity';
  if (['EURUSD', 'USDJPY', 'GBPUSD', 'AUDUSD', 'USDCAD', 'DXY'].some(x => s.includes(x))) return 'forex';
  return 'crypto';
};

const fetchBenchmark = async (symbol, interval, limit) => {
  if (symbol === 'BTCUSDT') {
    const res = await safeFetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (res && res.ok) return await res.json();
  } else {
    return await hlFetchKlines(symbol, interval, limit);
  }
  return null;
};

// ==========================================
// 🧮 核心数学与统计工具库
// ==========================================
const calculateEMA = (data, period) => {
  if (!data || data.length === 0) return [0];
  const k = 2 / (period + 1);
  let emaArray = [data[0]];
  for (let i = 1; i < data.length; i++) emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
  return emaArray;
};

const calculateATR = (highs, lows, closes, period = 14) => {
  const trs = [];
  for (let i = 1; i < closes.length; i++) {
    const h = highs[i], l = lows[i], pc = closes[i - 1];
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const atrs = [atr];
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period; 
    atrs.push(atr);
  }
  return atrs;
};

const calculateWMA = (data, period) => {
  let wmaArray = new Array(data.length).fill(0);
  if (data.length < period || period <= 0) return wmaArray;
  const denominator = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j] * (period - j);
    wmaArray[i] = sum / denominator;
  }
  return wmaArray;
};

const calculateHMA = (data, period) => {
  if (data.length < period || period <= 0) return new Array(data.length).fill(0);
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));
  const wmaHalf = calculateWMA(data, halfPeriod);
  const wmaFull = calculateWMA(data, period);
  const rawHMA = data.map((_, i) => (2 * wmaHalf[i]) - wmaFull[i]);
  return calculateWMA(rawHMA, sqrtPeriod);
};

const calculateALMA = (data, period, offset = 0.85, sigma = 6) => {
  let almaArray = new Array(data.length).fill(0);
  if (data.length < period || period <= 0) return almaArray;
  const m = offset * (period - 1);
  const s = period / sigma;
  let weights = [];
  let weightSum = 0;
  for (let i = 0; i < period; i++) {
    const w = Math.exp(-Math.pow(i - m, 2) / (2 * s * s));
    weights.push(w);
    weightSum += w;
  }
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - period + 1 + j] * weights[j]; 
    almaArray[i] = sum / weightSum;
  }
  return almaArray;
};

const calculateStdDev = (arr) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return { mean, stdDev: Math.sqrt(variance) };
};

const calculateCorrelation = (x, y) => {
  if (x.length !== y.length || x.length === 0) return 0;
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;
  return numerator / denominator;
};

const calculateHurst = (closes, period = 50) => {
  if (closes.length < period) return 0.5;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  let maxDev = -Infinity, minDev = Infinity, devSum = 0, devSqSum = 0;
  for (let i = 0; i < period; i++) {
    devSum += (slice[i] - mean);
    if (devSum > maxDev) maxDev = devSum;
    if (devSum < minDev) minDev = devSum;
    devSqSum += Math.pow(slice[i] - mean, 2);
  }
  const R = Math.max(maxDev - minDev, 0.0001);
  const S = Math.max(Math.sqrt(devSqSum / period), 0.0001);
  return Math.log(R / S) / Math.log(period);
};

const runMonteCarlo = (startPrice, target, stopLoss, historicalReturns, dailyVol, sims = 2000, days = 50, direction = 'long', drift = 0, volScale = 1) => {
  let hitsTarget = 0, hitsStop = 0, totalTargetSteps = 0; 
  const retLen = historicalReturns.length;
  if (retLen === 0) return { targetProb: '0.0', stopProb: '0.0', exhaustProb: '100.0', stepVol: '0.00', steps: days, avgTargetSteps: days };

  for (let i = 0; i < sims; i++) {
    let p = startPrice;
    for (let d = 0; d < days; d++) {
      const randIdx = Math.floor(Math.random() * retLen);
      const simulatedReturn = historicalReturns[randIdx] * volScale + drift;
      p = p * (1 + simulatedReturn);
      
      if (direction === 'long') {
        if (p >= target) { hitsTarget++; totalTargetSteps += (d + 1); break; }
        if (p <= stopLoss) { hitsStop++; break; }
      } else {
        if (p <= target) { hitsTarget++; totalTargetSteps += (d + 1); break; }
        if (p >= stopLoss) { hitsStop++; break; }
      }
    }
  }
  return {
    targetProb: ((hitsTarget / sims) * 100).toFixed(1),
    stopProb: ((hitsStop / sims) * 100).toFixed(1),
    exhaustProb: (((sims - hitsTarget - hitsStop) / sims) * 100).toFixed(1),
    stepVol: (dailyVol * 100).toFixed(2),
    steps: days,
    avgTargetSteps: hitsTarget > 0 ? (totalTargetSteps / hitsTarget) : days 
  };
};

const calculateLiquidationClusters = (data) => {
  if (!data || data.length < 50) return [];
  let bins = {};
  let recent = data.slice(-150); 
  let maxV = Math.max(...recent.map(d => parseFloat(d[5] || d.volume)), 0.0001);
  
  for (let i = 2; i < recent.length - 2; i++) {
     let d = recent[i];
     let high = parseFloat(d.high || d[2]); let low = parseFloat(d.low || d[3]); let vol = parseFloat(d.volume || d[5]);
     let prev1High = parseFloat(recent[i-1].high || recent[i-1][2]); let prev2High = parseFloat(recent[i-2].high || recent[i-2][2]);
     let next1High = parseFloat(recent[i+1].high || recent[i+1][2]); let next2High = parseFloat(recent[i+2].high || recent[i+2][2]);
     let prev1Low = parseFloat(recent[i-1].low || recent[i-1][3]); let prev2Low = parseFloat(recent[i-2].low || recent[i-2][3]);
     let next1Low = parseFloat(recent[i+1].low || recent[i+1][3]); let next2Low = parseFloat(recent[i+2].low || recent[i+2][3]);

     let isSwingHigh = high > prev1High && high > prev2High && high > next1High && high > next2High;
     let isSwingLow = low < prev1Low && low < prev2Low && low < next1Low && low < next2Low;

     if (isSwingHigh) {
        let p100 = (high * 1.01).toFixed(4); let p50 = (high * 1.02).toFixed(4);  
        bins[p100] = (bins[p100] || 0) + (vol/maxV) * 2; bins[p50] = (bins[p50] || 0) + (vol/maxV);
     }
     if (isSwingLow) {
        let p100 = (low * 0.99).toFixed(4); let p50 = (low * 0.98).toFixed(4);  
        bins[p100] = (bins[p100] || 0) + (vol/maxV) * 2; bins[p50] = (bins[p50] || 0) + (vol/maxV);
     }
  }
  let sorted = Object.entries(bins).map(([price, weight]) => ({ price: parseFloat(price), weight })).sort((a,b) => b.weight - a.weight);
  return sorted.slice(0, 5); 
};

const buildCompositeIndex = (results) => {
  const validResults = results.filter(r => r.rawData && r.rawData.length > 0);
  if (validResults.length === 0) return [];
  const minLen = Math.min(...validResults.map(r => r.rawData.length));
  const alignedResults = validResults.map(r => r.rawData.slice(-minLen));
  const basePrices = alignedResults.map(r => parseFloat(r[0][1]) || 1); 

  const indexRawData = [];
  for (let i = 0; i < minLen; i++) {
    let sumOpen = 0, sumHigh = 0, sumLow = 0, sumClose = 0, sumBuyRatio = 0;
    let timestamp = alignedResults[0][i][0]; 
    for (let j = 0; j < alignedResults.length; j++) {
      const kline = alignedResults[j][i]; const base = basePrices[j];
      sumOpen += (parseFloat(kline[1]) / base) * 1000; sumHigh += (parseFloat(kline[2]) / base) * 1000;
      sumLow += (parseFloat(kline[3]) / base) * 1000; sumClose += (parseFloat(kline[4]) / base) * 1000;
      const vol = parseFloat(kline[5]); const takerBuy = parseFloat(kline[9]);
      sumBuyRatio += vol > 0 ? (takerBuy / vol) : 0.5;
    }
    const count = alignedResults.length;
    const avgOpen = sumOpen / count; const avgClose = sumClose / count;
    const avgHigh = Math.max(sumHigh / count, avgOpen, avgClose);
    const avgLow = Math.min(sumLow / count, avgOpen, avgClose);
    const avgBuyRatio = sumBuyRatio / count;
    const dummyVol = 1000; const dummyTakerBuy = dummyVol * avgBuyRatio;
    indexRawData.push([timestamp, avgOpen.toString(), avgHigh.toString(), avgLow.toString(), avgClose.toString(), dummyVol.toString(), 0, 0, 0, dummyTakerBuy.toString(), 0, 0]);
  }
  return indexRawData;
};

const calculateQuantTD = (rawData, interval = '1d', macroStatus = null) => {
  if (!rawData || rawData.length === 0) return [];
  let config = { adxThreshold: 30, toleranceFactor: 0.15, requireCVD: false, modeName: '宏观趋势档' };
  if (['15m'].includes(interval)) config = { adxThreshold: 40, toleranceFactor: 0.30, requireCVD: true, modeName: '微观肉搏档' };
  else if (['1h', '4h'].includes(interval)) config = { adxThreshold: 35, toleranceFactor: 0.25, requireCVD: false, modeName: '战术震荡档' };
  
  let data = rawData.map(d => {
    let vol = parseFloat(d[5]); let takerBuy = parseFloat(d[9]); let takerSell = vol - takerBuy;
    return { time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]), volume: vol, takerBuy: takerBuy, takerSell: takerSell, delta: takerBuy - takerSell };
  });

  let tr = [], atr = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) tr.push(data[i].high - data[i].low);
    else tr.push(Math.max(data[i].high - data[i].low, Math.abs(data[i].high - data[i - 1].close), Math.abs(data[i].low - data[i - 1].close)));
  }
  for (let i = 0; i < data.length; i++) {
    if (i < 13) atr.push(tr[i]);
    else { let sum = 0; for (let j = 0; j < 14; j++) sum += tr[i - j]; atr.push(sum / 14); }
    data[i].atr = atr[i];
  }

  for (let i = 1; i < data.length; i++) {
    let upMove = data[i].high - data[i - 1].high; let downMove = data[i - 1].low - data[i].low;
    data[i].pDM = (upMove > downMove && upMove > 0) ? upMove : 0; data[i].mDM = (downMove > upMove && downMove > 0) ? downMove : 0;
  }
  let smoothTR = 0, smoothPDM = 0, smoothMDM = 0;
  for (let i = 1; i < data.length; i++) {
    if (i <= 14) {
      smoothTR += tr[i]; smoothPDM += data[i].pDM; smoothMDM += data[i].mDM;
      if (i === 14) {
        data[i].pDI = smoothTR === 0 ? 0 : 100 * smoothPDM / smoothTR; data[i].mDI = smoothTR === 0 ? 0 : 100 * smoothMDM / smoothTR;
        data[i].dx = (data[i].pDI + data[i].mDI === 0) ? 0 : 100 * Math.abs(data[i].pDI - data[i].mDI) / (data[i].pDI + data[i].mDI);
        data[i].adx = data[i].dx;
      } else { data[i].adx = 0; data[i].pDI = 0; data[i].mDI = 0; }
    } else {
      smoothTR = smoothTR - (smoothTR / 14) + tr[i]; smoothPDM = smoothPDM - (smoothPDM / 14) + data[i].pDM; smoothMDM = smoothMDM - (smoothMDM / 14) + data[i].mDM;
      data[i].pDI = smoothTR === 0 ? 0 : 100 * smoothPDM / smoothTR; data[i].mDI = smoothTR === 0 ? 0 : 100 * smoothMDM / smoothTR;
      data[i].dx = (data[i].pDI + data[i].mDI === 0) ? 0 : 100 * Math.abs(data[i].pDI - data[i].mDI) / (data[i].pDI + data[i].mDI);
      data[i].adx = (data[i - 1].adx * 13 + data[i].dx) / 14;
    }
  }

  for (let i = 0; i < data.length; i++) {
    if (i >= 13) {
      let sumTR = 0, maxH = -Infinity, minL = Infinity;
      for (let j = 0; j < 14; j++) {
        sumTR += tr[i - j];
        if (data[i - j].high > maxH) maxH = data[i - j].high;
        if (data[i - j].low < minL) minL = data[i - j].low;
      }
      data[i].chop = (maxH - minL === 0) ? 50 : 100 * Math.log10(sumTR / (maxH - minL)) / Math.log10(14);
    } else { data[i].chop = 50; }
  }

  let buySetup = 0, sellSetup = 0;
  for (let i = 0; i < data.length; i++) {
    data[i].tdCount = 0; data[i].tdType = null; data[i].signalLevel = 0; data[i].signalReason = [];
    data[i].isTolerated = false; data[i].isBlocked = false; data[i].isAbsorption = false; data[i].aiScore = 0;

    if (i >= 4) {
      let tolerance = config.toleranceFactor * (data[i].atr || 0); 
      let strictBuy = data[i].close < data[i - 4].close; let fuzzyBuy = data[i].close < (data[i - 4].close + tolerance);
      let strictSell = data[i].close > data[i - 4].close; let fuzzySell = data[i].close > (data[i - 4].close - tolerance);

      if (strictBuy) { buySetup++; sellSetup = 0; data[i].tdCount = buySetup; data[i].tdType = 'buy'; } 
      else if (fuzzyBuy && buySetup > 0) { buySetup++; sellSetup = 0; data[i].tdCount = buySetup; data[i].tdType = 'buy'; data[i].isTolerated = true; } 
      else if (strictSell) { sellSetup++; buySetup = 0; data[i].tdCount = sellSetup; data[i].tdType = 'sell'; } 
      else if (fuzzySell && sellSetup > 0) { sellSetup++; buySetup = 0; data[i].tdCount = sellSetup; data[i].tdType = 'sell'; data[i].isTolerated = true; } 
      else { buySetup = 0; sellSetup = 0; }
      if (buySetup === 9) buySetup = 0; 
      if (sellSetup === 9) sellSetup = 0; 
    }

    if (data[i].tdCount === 9) {
      let isSmart = Math.abs(data[i].close - data[i - 4].close) > (0.5 * data[i].atr);
      let isBlocked = false; let isBoosted = false; let fwReason = "";

      if (data[i].adx > config.adxThreshold && data[i].chop < 38) {
        if (data[i].tdType === 'buy' && data[i].mDI > data[i].pDI) { isBlocked = true; fwReason = "单边暴跌，禁止摸底"; } 
        else if (data[i].tdType === 'sell' && data[i].pDI > data[i].mDI) { isBlocked = true; fwReason = "单边暴涨，禁止猜顶"; }
      } else if (data[i].chop > 61) {
        isBoosted = true; fwReason = "本级别震荡主场，胜率加持";
      }
      data[i].isBlocked = isBlocked;

      let body = Math.abs(data[i].close - data[i].open);
      let upWick = data[i].high - Math.max(data[i].open, data[i].close);
      let dnWick = Math.min(data[i].open, data[i].close) - data[i].low;
      let isAbsorbed = false;

      if (data[i].tdType === 'sell' && upWick > body * 1.5 && data[i].takerBuy > data[i].takerSell * 1.5) isAbsorbed = true;
      else if (data[i].tdType === 'buy' && dnWick > body * 1.5 && data[i].takerSell > data[i].takerBuy * 1.5) isAbsorbed = true;
      data[i].isAbsorption = isAbsorbed;

      let isSweep = false;
      for (let k = i - 1; k >= Math.max(0, i - 50); k--) {
        let isSwingHigh = data[k].high > data[k-1]?.high && data[k].high > data[k+1]?.high;
        let isSwingLow = data[k].low < data[k-1]?.low && data[k].low < data[k+1]?.low;
        if (data[i].tdType === 'sell' && isSwingHigh && data[i].high > data[k].high && data[i].close < data[k].high) { isSweep = true; break; }
        if (data[i].tdType === 'buy' && isSwingLow && data[i].low < data[k].low && data[i].close > data[k].low) { isSweep = true; break; }
      }

      let baseProb = 48.5; 
      if (isSmart) baseProb += 8.2;
      if (isBoosted) baseProb += 12.5; 
      if (isSweep) baseProb += 14.3;   
      if (isAbsorbed) baseProb += 18.7;
      if (data[i].isTolerated) baseProb -= 5.1; 
      
      let noise = ((data[i].volume % 100) / 100) * 4.5 - 2.25;
      let finalProb = Math.min(Math.max(baseProb + noise, 12.5), 96.8);
      if (isBlocked) finalProb = Math.max(finalProb - 45.5, 5.2);
      
      data[i].aiScore = finalProb.toFixed(1);
      data[i].signalLevel = isAbsorbed ? 4 : (isSweep || isBoosted) ? 3 : (isSmart ? 2 : 1);
    }
  }
  return data;
};

// ==========================================
// 🚀 Main Application Component
// ==========================================
export default function App() {
  const [coins, setCoins] = useState(() => {
    try {
      const savedCoins = localStorage.getItem('star_crypto_coins');
      if (savedCoins) {
        const parsed = JSON.parse(savedCoins).filter(c => c !== 'BTCUSDT' && c !== 'CCI'); 
        const uniqueParsed = [...new Set(parsed)]; 
        return ['BTCUSDT', ...uniqueParsed];
      }
    } catch (e) {}
    return DEFAULT_COINS;
  });

  const [newCoin, setNewCoin] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);
  const scanIdRef = useRef(0); 
  const scanMarketRef = useRef(null); 
  const hasAutoSetDirectionRef = useRef(false); 
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [klineInterval, setKlineInterval] = useState('4h');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  const [marketEnv, setMarketEnv] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [chartDataCache, setChartDataCache] = useState({});
  
  const [totalCapital, setTotalCapital] = useState(10000); 
  const [riskPerTrade, setRiskPerTrade] = useState(2);     

  const [tradeDirection, setTradeDirection] = useState('long');
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  const [isLiveMode, setIsLiveMode] = useState(true);
  const [livePrices, setLivePrices] = useState({});
  const [wakeUpTrigger, setWakeUpTrigger] = useState(0); 
  const [radarPulse, setRadarPulse] = useState(0); // 💓 脉冲起搏器状态
  const tickBufferRef = useRef({}); 

  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isRadarScanning, setIsRadarScanning] = useState(false);
  const [radarProgress, setRadarProgress] = useState(0);
  const [radarStatus, setRadarStatus] = useState('');
  const [radarResults, setRadarResults] = useState([]);
  const isRadarOpenRef = useRef(false);

  const [coinRanks, setCoinRanks] = useState({});

  const [danmakus, setDanmakus] = useState([]);
  const [danmakuHistory, setDanmakuHistory] = useState([]); 
  const [danmakuInput, setDanmakuInput] = useState('');
  const [userRegion, setUserRegion] = useState('神秘节点'); 
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); 
  const ablyChannelRef = useRef(null);
  const chatEndRef = useRef(null);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReportContent, setAiReportContent] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('star_gemini_api_key') || '');
  const [claudeApiKey, setClaudeApiKey] = useState(() => localStorage.getItem('star_claude_api_key') || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('star_openai_api_key') || '');
  const [deepseekApiKey, setDeepseekApiKey] = useState(() => localStorage.getItem('star_deepseek_api_key') || '');
  const [selectedAiProvider, setSelectedAiProvider] = useState(() => localStorage.getItem('star_ai_provider') || 'gemini');
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [aiReasoningContent, setAiReasoningContent] = useState(null);
  const [showReasoning, setShowReasoning] = useState(false);

  const [tooltipData, setTooltipData] = useState(null);

  const [isGeneratingMacro, setIsGeneratingMacro] = useState(false); 
  const [isGeneratingMicro, setIsGeneratingMicro] = useState(false); 
  const [posterDataUrl, setPosterDataUrl] = useState(null);
  const [macroPosterData, setMacroPosterData] = useState(null); 
  const [microPosterData, setMicroPosterData] = useState(null); 

  const [isSentinelRunning, setIsSentinelRunning] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [showOnlyStar, setShowOnlyStar] = useState(false);
  const sentinelRunningRef = useRef(false);

  const tooltipTimeoutRef = useRef(null);

  const handleMouseEnterTooltip = useCallback((type, res, e) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipData({ type, res, rect });
  }, []);

  const handleMouseLeaveTooltip = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => setTooltipData(null), 250); 
  }, []);

  const handleTooltipWindowEnter = useCallback(() => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); 
  }, []);

  const handleTooltipWindowLeave = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => setTooltipData(null), 250); 
  }, []);

  useEffect(() => {
    initGlobalData(); 
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.region) setUserRegion(data.region);
        else if (data.city) setUserRegion(data.city);
        else if (data.country_name) setUserRegion(data.country_name);
      })
      .catch(() => setUserRegion('星辰漫游者')); 

    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isHistoryOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [danmakuHistory, isHistoryOpen]);

  useEffect(() => {
    if (!ABLY_API_KEY) return;
    let ablyInstance = null;
    let channelInstance = null;
    try {
      ablyInstance = new Ably.Realtime({ key: ABLY_API_KEY });
      channelInstance = ablyInstance.channels.get('star-crypto-danmaku');
      ablyChannelRef.current = channelInstance;

      channelInstance.history({ limit: 200 }, (err, resultPage) => {
        if (err) return;
        const pastMsgs = resultPage.items.map(msg => ({
          id: msg.id || Date.now() + Math.random(),
          text: String(msg.data.text),
          color: String(msg.data.color),
          top: msg.data.top,
          region: String(msg.data.region || '神秘节点'),
          timestamp: msg.data.timestamp || msg.timestamp || Date.now(),
        })).reverse();
        setDanmakuHistory(pastMsgs);
      });

      channelInstance.subscribe('new-danmaku', (message) => {
        const newDanmaku = {
          id: message.id || Date.now() + Math.random(),
          text: String(message.data.text),
          color: String(message.data.color),
          top: message.data.top,
          region: String(message.data.region || '神秘节点'),
          timestamp: message.data.timestamp || Date.now(),
        };
        setDanmakus((prev) => [...prev, newDanmaku]);
        setDanmakuHistory((prev) => [...prev, newDanmaku].slice(-200));
        setTimeout(() => {
          setDanmakus((prev) => prev.filter((d) => d.id !== newDanmaku.id));
        }, 8000);
      });
    } catch (e) {}

    return () => {
      if (channelInstance) channelInstance.unsubscribe();
      if (ablyInstance) ablyInstance.close();
    };
  }, []);

  const handleSendDanmaku = (e) => {
    e.preventDefault();
    const text = danmakuInput.trim();
    if (!text) return;
    const payload = {
      text: text,
      color: ['#22d3ee', '#818cf8', '#f87171', '#a78bfa', '#34d399', '#fbbf24'][Math.floor(Math.random() * 6)],
      top: Math.floor(Math.random() * 40) + 10, 
      region: userRegion,
      timestamp: Date.now(),
    };
    if (ablyChannelRef.current) ablyChannelRef.current.publish('new-danmaku', payload);
    else {
      const localDanmaku = { id: Date.now(), ...payload };
      setDanmakus(prev => [...prev, localDanmaku]);
      setDanmakuHistory(prev => [...prev, localDanmaku].slice(-200));
      setTimeout(() => setDanmakus((prev) => prev.filter((d) => d.id !== localDanmaku.id)), 8000);
    }
    setDanmakuInput('');
  };

  const handleUpdateCoins = (newCoins) => {
    const filtered = newCoins.filter(c => c !== 'BTCUSDT' && c !== 'CCI');
    const uniqueFiltered = [...new Set(filtered)]; 
    const finalCoins = ['BTCUSDT', ...uniqueFiltered];
    setCoins(finalCoins);
    try { localStorage.setItem('star_crypto_coins', JSON.stringify(finalCoins)); } catch (e) {}
  };

  const analyzeKlines = useCallback((symbol, klines, benchmarkKlines, klines15m, depth, fundingRate, openInterest, envData, interval, direction = 'long', category = 'crypto', isBenchmark = false, isSentinelExtreme = false) => {
    if (!klines || klines.length < 150) return null;

    const tdData = calculateQuantTD(klines, interval, null);
    const lastTd = tdData.length > 0 ? tdData[tdData.length - 1] : null;

    const chartFormatData = klines.map(k => ({
      time: Math.floor(k[0] / 1000), 
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    })).sort((a, b) => a.time - b.time);

    const liqClusters = calculateLiquidationClusters(klines);

    const opens = klines.map(k => parseFloat(k[1]));
    const highs = klines.map(k => parseFloat(k[2]));
    const lows = klines.map(k => parseFloat(k[3]));
    const closes = klines.map(k => parseFloat(k[4]));
    const volumes = klines.map(k => parseFloat(k[5]));
    const takerBuys = klines.map(k => parseFloat(k[9]));

    const currentPrice = closes[closes.length - 1];
    
    const bbWidths = [];
    for(let i=20; i<closes.length; i++) {
      const slice = closes.slice(i-20, i);
      const sma = slice.reduce((a,b)=>a+b,0)/20;
      const vari = slice.reduce((a,b)=>a+Math.pow(b-sma,2),0)/20;
      bbWidths.push((Math.sqrt(vari) * 4) / (sma || 1));
    }
    const currentBBW = bbWidths[bbWidths.length - 1];
    const { mean: bbwMean, stdDev: bbwStd } = calculateStdDev(bbWidths.slice(-100));
    const isZScoreSqueeze = currentBBW < (bbwMean - 1.5 * bbwStd);

    const sortedBBWs = [...bbWidths.slice(-100)].sort((a,b)=>a-b);
    const currentBBWIndex = sortedBBWs.findIndex(w => w >= currentBBW);
    const bbwPercentile = sortedBBWs.length > 0 ? (currentBBWIndex / sortedBBWs.length) * 100 : 50;
    
    let volLoadFactor = 1.0;
    if (bbwPercentile <= 20) volLoadFactor = 1.8; 
    else if (bbwPercentile >= 80) volLoadFactor = 0.5; 
    else volLoadFactor = 1.0 + (50 - bbwPercentile) / 100; 
    volLoadFactor = Math.max(0.5, Math.min(2.0, volLoadFactor));

    let buyWall = { price: 0, qty: 0, value: 0 };
    let bidVol = 0, askVol = 0; 
    if (depth) {
      if (depth.bids) {
        depth.bids.forEach(b => {
          const price = parseFloat(b[0]);
          const qty = parseFloat(b[1]);
          if (price >= currentPrice * 0.95) bidVol += qty;
          if (direction === 'long' && price >= currentPrice * 0.90 && price <= currentPrice) { 
            if (qty * price > buyWall.value) buyWall = { price, qty, value: qty * price };
          }
        });
      }
      if (depth.asks) {
        depth.asks.forEach(a => {
          const price = parseFloat(a[0]);
          const qty = parseFloat(a[1]);
          if (price <= currentPrice * 1.05) askVol += qty;
          if (direction === 'short' && price <= currentPrice * 1.10 && price >= currentPrice) { 
            if (qty * price > buyWall.value) buyWall = { price, qty, value: qty * price };
          }
        });
      }
    }

    let is15mPump = false;
    let is15mDump = false;
    if (klines15m && klines15m.length > 20) {
      const closes15m = klines15m.map(k => parseFloat(k[4]));
      const hma20_15m = calculateHMA(closes15m, 20).pop(); 
      is15mPump = closes15m[closes15m.length-1] > hma20_15m; 
      is15mDump = closes15m[closes15m.length-1] < hma20_15m; 
    }

    let beta = 0;
    if (benchmarkKlines && benchmarkKlines.length === closes.length) {
      const bmkCloses = benchmarkKlines.map(k => parseFloat(k[4]));
      const bmkReturns = [];
      const coinReturns = [];
      for(let i=closes.length-50; i<closes.length; i++) {
        bmkReturns.push((bmkCloses[i] - bmkCloses[i-1])/bmkCloses[i-1]);
        coinReturns.push((closes[i] - closes[i-1])/closes[i-1]);
      }
      beta = calculateCorrelation(bmkReturns, coinReturns);
    }

    const atrs = calculateATR(highs, lows, closes, 14);
    const currentATR = atrs[atrs.length - 1];

    let cvd = 0;
    const cvdArray = [];
    for (let i = 0; i < klines.length; i++) {
      cvd += (takerBuys[i] - (volumes[i] - takerBuys[i]));
      cvdArray.push(cvd);
    }

    const hurst = calculateHurst(closes, 50);
    let volRegime = 'Normal';
    if (hurst < 0.45) volRegime = 'Mean_Reversion'; 
    else if (hurst > 0.55) volRegime = 'Trend_Following'; 

    const priceBuckets = {};
    let maxVol = 0;
    let pocPrice = 0;
    let totalVolForVPVR = 0;
    let volPriceSumForVPVR = 0;
    const sliceLen = Math.min(150, klines.length);
    
    const recentHighs = highs.slice(-sliceLen);
    const recentLows = lows.slice(-sliceLen);
    const pHigh = Math.max(...recentHighs);
    const pLow = Math.min(...recentLows);
    
    const BUCKET_COUNT = 60; 
    const bucketSize = (pHigh - pLow) / BUCKET_COUNT || (currentPrice * 0.001);

    for (let i = klines.length - sliceLen; i < klines.length; i++) {
      const h = highs[i];
      const l = lows[i];
      const v = volumes[i];

      if (h === l) {
        let binIndex = Math.floor((h - pLow) / bucketSize);
        binIndex = Math.max(0, Math.min(BUCKET_COUNT - 1, binIndex));
        const bucketCenter = pLow + (binIndex + 0.5) * bucketSize;
        const bucketKey = parseFloat(bucketCenter.toPrecision(6));
        priceBuckets[bucketKey] = (priceBuckets[bucketKey] || 0) + v;
      } else {
        for (let b = 0; b < BUCKET_COUNT; b++) {
          const bLow = pLow + b * bucketSize;
          const bHigh = pLow + (b + 1) * bucketSize;
          const overlap = Math.max(0, Math.min(h, bHigh) - Math.max(l, bLow));
          
          if (overlap > 0) {
            const weight = overlap / (h - l);
            const distributedVol = v * weight;
            const bucketCenter = pLow + (b + 0.5) * bucketSize;
            const bucketKey = parseFloat(bucketCenter.toPrecision(6));
            priceBuckets[bucketKey] = (priceBuckets[bucketKey] || 0) + distributedVol;
          }
        }
      }
    }

    for (const [priceStr, vol] of Object.entries(priceBuckets)) {
      totalVolForVPVR += vol;
      volPriceSumForVPVR += parseFloat(priceStr) * vol;
      if (vol > maxVol) {
        maxVol = vol;
        pocPrice = parseFloat(priceStr);
      }
    }

    const vwapPrice = totalVolForVPVR > 0 ? volPriceSumForVPVR / totalVolForVPVR : currentPrice;
    const vpvrSkewness = vwapPrice > 0 ? (pocPrice - vwapPrice) / vwapPrice : 0;

    let profileShape = 'D型';
    if (vpvrSkewness < -0.015) profileShape = 'b型';
    else if (vpvrSkewness > 0.015) profileShape = 'P型';

    const vpvrData = Object.keys(priceBuckets).map(p => ({
      price: parseFloat(p),
      volume: priceBuckets[p],
      normalizedVol: priceBuckets[p] / maxVol 
    })).sort((a, b) => b.price - a.price);

    // 🚀 V20.0 终极量化核武：显性市场结构引擎 (Market Structure State Machine)
    let smcOB = null;
    let isSMCResonance = false;

    // 1. 算力下沉：分形枢轴点 (Fractal Pivots) 提取与时序排列
    const pivots = [];
    const pivotHighs = [];
    const pivotLows = [];
    const pLen = 5; 
    for (let i = pLen; i < closes.length - pLen; i++) {
       let isPH = true, isPL = true;
       for (let j = 1; j <= pLen; j++) {
           if (highs[i - j] >= highs[i] || highs[i + j] >= highs[i]) isPH = false;
           if (lows[i - j] <= lows[i] || lows[i + j] <= lows[i]) isPL = false;
       }
       if (isPH) { pivots.push({ type: 'PH', index: i, price: highs[i] }); pivotHighs.push({ index: i, price: highs[i] }); }
       if (isPL) { pivots.push({ type: 'PL', index: i, price: lows[i] }); pivotLows.push({ index: i, price: lows[i] }); }
    }
    pivots.sort((a, b) => a.index - b.index);

    // 2. 状态机核反应堆：动态追踪 BOS 与 CHoCH
    let msState = 'Neutral'; 
    let lastHH = -Infinity, lastHL = -Infinity;
    let lastLH = Infinity, lastLL = Infinity;
    let chochSignal = '';
    let recentBOS = '';

    for (let p of pivots) {
        if (p.type === 'PH') {
            if (p.price > lastHH) { 
                if (msState === 'Bullish') recentBOS = 'Bullish BOS';
                if (msState === 'Bearish' && p.price > lastLH) {
                    msState = 'Bullish'; chochSignal = 'Bullish CHoCH';
                }
                lastHH = p.price;
            } else {
                lastLH = p.price; 
            }
        } else {
            if (p.price < lastLL) { 
                if (msState === 'Bearish') recentBOS = 'Bearish BOS';
                if (msState === 'Bullish' && p.price < lastHL) {
                    msState = 'Bearish'; chochSignal = 'Bearish CHoCH';
                }
                lastLL = p.price;
            } else {
                lastHL = p.price; 
            }
        }
    }

    // 实时(Live)刺透验证：现价实体是否摧毁了最后防线
    if (msState === 'Bullish' && currentPrice < lastHL) {
        msState = 'Bearish'; chochSignal = 'Live Bearish CHoCH 🚨';
    } else if (msState === 'Bearish' && currentPrice > lastLH) {
        msState = 'Bullish'; chochSignal = 'Live Bullish CHoCH 🚀';
    }

    const isBullishMS = msState === 'Bullish';
    const isBearishMS = msState === 'Bearish';
    
    // [修复 1] 替换硬编码 5% 乖离率陷阱，使用 3 倍 ATR 动态判断是否严重偏离宏观结构
    const isOverExtendedStruct = direction === 'long' ? (currentPrice > lastHH + (currentATR * 3)) : (currentPrice < lastLL - (currentATR * 3));

    // 3. 划定溢价/折扣区 (Dealing Range & PD Array)
    const macroHigh = lastHH !== -Infinity ? lastHH : Math.max(...highs.slice(-100));
    const macroLow = lastLL !== Infinity ? lastLL : Math.min(...lows.slice(-100));
    const eqLevel = (macroHigh + macroLow) / 2; 

    // 4. 彻底清算的 FVG 引擎 (True Mitigation)
    let activeBullFVGs = [];
    let activeBearFVGs = [];
    for (let i = 2; i < closes.length - 1; i++) {
       if (lows[i] > highs[i-2]) activeBullFVGs.push({ top: lows[i], bottom: highs[i-2], index: i });
       if (highs[i] < lows[i-2]) activeBearFVGs.push({ top: lows[i-2], bottom: highs[i], index: i });
       
       activeBullFVGs = activeBullFVGs.filter(fvg => lows[i] > fvg.bottom); // 跌破缺口底边即失效
       activeBearFVGs = activeBearFVGs.filter(fvg => highs[i] < fvg.top);   // 突破缺口顶边即失效
    }
    // 强制折扣区物理约束
    activeBullFVGs = activeBullFVGs.filter(fvg => fvg.top <= eqLevel && fvg.top < currentPrice);
    activeBearFVGs = activeBearFVGs.filter(fvg => fvg.bottom >= eqLevel && fvg.bottom > currentPrice);
    
    let latestBullFVG = activeBullFVGs.length > 0 ? activeBullFVGs[activeBullFVGs.length - 1] : null;
    let latestBearFVG = activeBearFVGs.length > 0 ? activeBearFVGs[activeBearFVGs.length - 1] : null;

    // 5. 寻找极值订单块 (Origin OB) 并实施 ATR 极权压缩
    const obLookback = Math.min(150, klines.length);
    let activeBullOBs = [];
    let activeBearOBs = [];

    const validBullish = isSentinelExtreme ? true : isBullishMS;
    const validBearish = isSentinelExtreme ? true : isBearishMS;

    for (let i = klines.length - obLookback; i < klines.length - 1; i++) {
       // [逻辑刺客 3 修复] 左侧特赦阵列：允许极端行情插针刺穿订单块而不被物理销毁 (缓冲 1.5 倍 ATR)
       if (isSentinelExtreme) {
           activeBullOBs = activeBullOBs.filter(ob => lows[i] > ob.bottom - (currentATR * 1.5)); 
           activeBearOBs = activeBearOBs.filter(ob => highs[i] < ob.top + (currentATR * 1.5)); 
       } else {
           activeBullOBs = activeBullOBs.filter(ob => lows[i] > ob.bottom); 
           activeBearOBs = activeBearOBs.filter(ob => highs[i] < ob.top); 
       }

       const bodyNext = Math.abs(closes[i+1] - opens[i+1]);
       const isImpulse = bodyNext > currentATR * 1.5; 

       if (direction === 'long' && validBullish && closes[i+1] > opens[i+1] && isImpulse && closes[i] <= opens[i]) {
          let obTop = highs[i]; let obBottom = lows[i];
          let thickness = obTop - obBottom;
          
          if (thickness >= currentATR * 3) { obTop = obBottom + (thickness * 0.3); } 
          else if (thickness >= currentATR * 2) { obTop = obBottom + (thickness * 0.4); }
          
          if (isSentinelExtreme || (lastHL !== -Infinity && obBottom <= lastHL * 1.02)) { // 特赦下忽略防线依托限制
             activeBullOBs.push({ top: obTop, bottom: obBottom, type: 'bullish', isSweep: true });
          }
       } 
       else if (direction === 'short' && validBearish && closes[i+1] < opens[i+1] && isImpulse && closes[i] >= opens[i]) {
          let obTop = highs[i]; let obBottom = lows[i];
          let thickness = obTop - obBottom;
          
          if (thickness >= currentATR * 3) { obBottom = obTop - (thickness * 0.3); } 
          else if (thickness >= currentATR * 2) { obBottom = obTop - (thickness * 0.4); }
          
          if (isSentinelExtreme || (lastLH !== Infinity && obTop >= lastLH * 0.98)) {
             activeBearOBs.push({ top: obTop, bottom: obBottom, type: 'bearish', isSweep: true });
          }
       }
    }

    if (direction === 'long') {
        const validLimit = Math.min(eqLevel, currentPrice * 0.995);
        if (!isSentinelExtreme) activeBullOBs = activeBullOBs.filter(ob => ob.top <= validLimit);
    } else {
        const validLimit = Math.max(eqLevel, currentPrice * 1.005);
        if (!isSentinelExtreme) activeBearOBs = activeBearOBs.filter(ob => ob.bottom >= validLimit);
    }

    if (direction === 'long' && activeBullOBs.length > 0) {
        smcOB = activeBullOBs[activeBullOBs.length - 1];
        isSMCResonance = true;
    } else if (direction === 'short' && activeBearOBs.length > 0) {
        smcOB = activeBearOBs[activeBearOBs.length - 1];
        isSMCResonance = true;
    }
    
    let targetFVG = direction === 'long' ? latestBullFVG : latestBearFVG;

    // 6. 狙击手单点顺位法 (Entry Hierarchy) 无均线裸K版
    let entryForRRR;
    let isFOMO = false;
    let entryType = '';

    if (direction === 'long') {
       if (smcOB) {
          entryForRRR = smcOB.top;
          entryType = '多头提纯订单块 (Origin OB)';
       } else if (targetFVG) {
          entryForRRR = targetFVG.top;
          entryType = '折扣区未补缺口 (Discount FVG)';
       } else {
          // [逻辑刺客 2 修复] 切断 POC 历史黑洞引力。仅当 POC 位于现价下方 3x ATR 范围内时才参考，否则强行使用动态回撤兜底
          const dynPullback = currentPrice - (currentATR * 1.2);
          entryForRRR = (pocPrice > currentPrice - (currentATR * 3) && pocPrice < currentPrice) ? pocPrice : dynPullback; 
          entryType = '动态回撤兜底 (Dynamic Pullback)';
       }
       if (currentPrice > entryForRRR + (currentATR * 2)) isFOMO = true;
    } else {
       if (smcOB) {
          entryForRRR = smcOB.bottom;
          entryType = '空头提纯订单块 (Origin OB)';
       } else if (targetFVG) {
          entryForRRR = targetFVG.bottom;
          entryType = '溢价区未补缺口 (Premium FVG)';
       } else {
          // [逻辑刺客 2 修复] 切断天花板 POC 历史黑洞引力。仅当其在合理反弹范围内时启用
          const dynBounce = currentPrice + (currentATR * 1.2);
          entryForRRR = (pocPrice < currentPrice + (currentATR * 3) && pocPrice > currentPrice) ? pocPrice : dynBounce;
          entryType = '动态反弹兜底 (Dynamic Bounce)';
       }
       if (currentPrice < entryForRRR - (currentATR * 2)) isFOMO = true;
    }
    
    const atrLookback = Math.min(100, atrs.length);
    const smoothedATR = atrs.slice(-atrLookback).reduce((a, b) => a + b, 0) / atrLookback;
    
    // 🛡️ 结构极权止损 (Structure Stop)
    let rawStopLoss;
    if (smcOB && entryType.includes('OB')) {
        rawStopLoss = direction === 'long' ? smcOB.bottom - (smoothedATR * 0.2) : smcOB.top + (smoothedATR * 0.2); 
    } else if (targetFVG && entryType.includes('FVG')) {
        rawStopLoss = direction === 'long' ? targetFVG.bottom - (smoothedATR * 0.5) : targetFVG.top + (smoothedATR * 0.5); 
    } else {
        rawStopLoss = direction === 'long' ? ((lastHL !== -Infinity && lastHL < entryForRRR) ? lastHL - (smoothedATR * 0.5) : entryForRRR - (smoothedATR * 1.5)) 
                                        : ((lastLH !== Infinity && lastLH > entryForRRR) ? lastLH + (smoothedATR * 0.5) : entryForRRR + (smoothedATR * 1.5));
    }

    // [补丁 1] 最小物理磨损垫 (防极限微观止损被滑点秒杀)
    const avgBody = closes.slice(-20).reduce((acc, c, idx) => acc + Math.abs(c - opens[closes.length - 20 + idx]), 0) / 20;
    const minStopDist = Math.max(avgBody * 0.6, currentPrice * 0.002); // 止损绝不能小于大半个均K线实体，或千分之二滑点空间
    
    let stopLoss = rawStopLoss;
    const currentDist = Math.abs(entryForRRR - rawStopLoss);
    if (currentDist < minStopDist) {
        stopLoss = direction === 'long' ? entryForRRR - minStopDist : entryForRRR + minStopDist;
    }

    let targetPrice;
    const rrrDetails = {
      smoothedATR, eqLevel, macroHigh, macroLow, lastHH, lastLL, lastHL, lastLH,
      regime: '', regimeReason: '', targetPrice: 0, riskAmount: Math.abs(entryForRRR - stopLoss),
      profitAmount: 0, isFOMO, liveRRR: 0, targetFVG, msState, chochSignal
    };

    if (direction === 'long') {
      if (entryForRRR >= macroHigh - smoothedATR) {
          rrrDetails.regime = 'C'; rrrDetails.regimeReason = '逼近/冲破波段大顶，顺势延续预期。';
          targetPrice = entryForRRR + (smoothedATR * 4.5); 
      } else if (currentPrice < eqLevel) {
          rrrDetails.regime = 'A'; rrrDetails.regimeReason = `现价处折扣区底部，吃满结构空间。`;
          targetPrice = macroHigh;
      } else {
          rrrDetails.regime = 'B'; rrrDetails.regimeReason = `向溢价区顶部发起冲击。`;
          targetPrice = macroHigh;
      }
    } else {
      if (entryForRRR <= macroLow + smoothedATR) {
          rrrDetails.regime = 'C'; rrrDetails.regimeReason = '跌穿波段大底，主跌浪预期。';
          targetPrice = Math.max(0.00001, entryForRRR - (smoothedATR * 4.5)); 
      } else if (currentPrice > eqLevel) {
          rrrDetails.regime = 'A'; rrrDetails.regimeReason = `现价处溢价区顶部，吃满结构空间。`;
          targetPrice = macroLow;
      } else {
          rrrDetails.regime = 'B'; rrrDetails.regimeReason = `向折扣区底部发起冲击。`;
          targetPrice = macroLow;
      }
    }

    let isFVGMagnet = false;
    let profitTargetFVG = direction === 'long' ? latestBearFVG : latestBullFVG;
    if (profitTargetFVG) {
       if (direction === 'long' && targetPrice >= profitTargetFVG.bottom && targetPrice <= profitTargetFVG.top * 1.05) {
          isFVGMagnet = true; targetPrice = profitTargetFVG.top; 
       } else if (direction === 'short' && targetPrice <= profitTargetFVG.top && targetPrice >= profitTargetFVG.bottom * 0.95) {
          isFVGMagnet = true; targetPrice = profitTargetFVG.bottom; 
       }
    }

    rrrDetails.targetPrice = targetPrice;
    rrrDetails.profitAmount = Math.abs(targetPrice - entryForRRR);

    const rrr = Math.abs(entryForRRR - stopLoss) > 0 ? (Math.abs(targetPrice - entryForRRR) / Math.abs(entryForRRR - stopLoss)) : 0;
    
    const liveStopLoss = direction === 'long' ? currentPrice - (smoothedATR * 1.5) : currentPrice + (smoothedATR * 1.5);
    const liveRRR = Math.abs(currentPrice - liveStopLoss) > 0 ? (Math.abs(targetPrice - currentPrice) / Math.abs(currentPrice - liveStopLoss)) : 0;
    rrrDetails.liveRRR = liveRRR.toFixed(2);

    let mcSteps = 50; 
    if (interval === '1h') mcSteps = 300;       
    else if (interval === '4h') mcSteps = 120;  
    else if (interval === '1d') mcSteps = 50;   

    const historicalReturns = [];
    for(let i = 1; i < closes.length; i++) {
       historicalReturns.push((closes[i] - closes[i-1]) / closes[i-1]);
    }

    const volScale = Math.max(0.5, Math.min(2.0, currentATR / (smoothedATR || 1)));

    const stepVolatility = smoothedATR / currentPrice; 
    // [修复 3] 移除 drift 二次叠加，因为 historicalReturns 抽样已天然包含真实动量漂移
    const mcResults = runMonteCarlo(entryForRRR, targetPrice, stopLoss, historicalReturns, stepVolatility, 2000, mcSteps, direction, 0, volScale);
    const takerBuyRatio = takerBuys.slice(-10).reduce((a, b) => a + b, 0) / (volumes.slice(-10).reduce((a, b) => a + b, 0) || 1);

    const recentTakerVol = takerBuys.slice(-3).reduce((a, b) => a + b, 0);
    const recentTotalVol = volumes.slice(-3).reduce((a, b) => a + b, 0) || 1;
    const recentTakerRatio = recentTakerVol / recentTotalVol;

    const baseTakerVol = takerBuys.slice(-10, -3).reduce((a, b) => a + b, 0);
    const baseTotalVol = volumes.slice(-10, -3).reduce((a, b) => a + b, 0) || 1;
    const baseTakerRatio = baseTakerVol / baseTotalVol;

    const takerAcceleration = recentTakerRatio - baseTakerRatio; 

    // 🚀 V21.0 冰山吸收探测 (Iceberg Absorption)
    let isBullishAbsorption = false;
    let isBearishAbsorption = false;

    const recentPLs = pivotLows.slice(-2);
    if (recentPLs.length === 2 && direction === 'long') {
        const [prevPL, lastPL] = recentPLs;
        if (lastPL.price < prevPL.price && cvdArray[lastPL.index] > cvdArray[prevPL.index]) {
            isBullishAbsorption = true;
        }
    }

    const recentPHs = pivotHighs.slice(-2);
    if (recentPHs.length === 2 && direction === 'short') {
        const [prevPH, lastPH] = recentPHs;
        if (lastPH.price > prevPH.price && cvdArray[lastPH.index] < cvdArray[prevPH.index]) {
            isBearishAbsorption = true;
        }
    }

    // 📊 CVD 宏观顶底背离 (Macroscopic CVD Divergence)
    let cvdDiv = 'None';
    let cvdDivAge = 0;
    for (let i = 0; i < 6; i++) { 
        const idx = closes.length - 1 - i;
        if (idx < 20) break;
        const p10 = Math.max(0, idx - 10);
        const p20 = Math.max(0, idx - 20);
        
        const priceLL = lows[idx] < Math.min(...lows.slice(p20, p10));
        const cvdHL = cvdArray[idx] > Math.min(...cvdArray.slice(p20, p10));
        const priceHH = highs[idx] > Math.max(...highs.slice(p20, p10));
        const cvdLH = cvdArray[idx] < Math.max(...cvdArray.slice(p20, p10));
        
        if (priceLL && cvdHL) { cvdDiv = 'Bullish'; cvdDivAge = i; break; }
        if (priceHH && cvdLH) { cvdDiv = 'Bearish'; cvdDivAge = i; break; }
    }

    // ==========================================
    // 🧠 核心量化打分引擎：矩阵计算
    // ==========================================
    const isCCI = symbol === 'CCI';
    const displaySymbol = symbol.replace('HL:', '').replace(/USDT|USDC/g, '');
    
    let calculatedScore = 50; 
    const scoreBreakdown = []; 
    const signals = [];
    
    if (!isBenchmark && !isCCI) { 
      if (beta < 0.3) { 
        calculatedScore = 60; 
        scoreBreakdown.push({ reason: `独立 Alpha 标的 (Beta < 0.3 与 ${category}基准剥离)`, delta: 10 });
      } else if (beta > 0.7) { 
        calculatedScore = 45; 
        scoreBreakdown.push({ reason: `大盘同质化标的 (Beta > 0.7 随波逐流)`, delta: -5 });
      }
    }

    if (!isCCI) {
      if (direction === 'long') {
         if (vpvrSkewness < -0.015) { calculatedScore += 10; scoreBreakdown.push({ reason: "筹码重心底宽顶尖 (底部坚实吸筹)", delta: 10 }); } 
         else if (vpvrSkewness > 0.015) { calculatedScore -= 15; scoreBreakdown.push({ reason: "筹码重心头重脚轻 (上方套牢盘厚重)", delta: -15 }); }
      } else {
         if (vpvrSkewness > 0.015) { calculatedScore += 10; scoreBreakdown.push({ reason: "筹码重心头重脚轻 (高位坚实派发区)", delta: 10 }); } 
         else if (vpvrSkewness < -0.015) { calculatedScore -= 15; scoreBreakdown.push({ reason: "筹码重心底宽顶尖 (下方支撑极强极难跌破)", delta: -15 }); }
      }
    }

    // [补丁 3] 资金费率与未平仓合约拥挤度惩罚
    if (!isCCI && fundingRate && openInterest > 0) {
      if (direction === 'long') {
          if (fundingRate < -0.0005) {
              const fundingDelta = isBenchmark ? 30 : 15; 
              calculatedScore += fundingDelta;
              signals.push({ text: isBenchmark ? "☢️ 裁判级轧空信号" : "🧲 轧空燃料", color: "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]" });
              scoreBreakdown.push({ reason: `极度负费率 (${isBenchmark ? '基准特权' : '山寨因子'})，易引发轧空`, delta: fundingDelta });
          } else if (fundingRate > 0.001) {
              calculatedScore -= 20;
              signals.push({ text: "⚠️ 多头极度拥挤", color: "bg-red-500/20 text-red-400 border border-red-500/30" });
              scoreBreakdown.push({ reason: `极端高资金费率 (>0.1%)，多头极度拥挤，易引发多杀多踩踏清算`, delta: -20 });
          }
      } else if (direction === 'short') {
          if (fundingRate > 0.0005) {
              const fundingDelta = isBenchmark ? 30 : 15; 
              calculatedScore += fundingDelta;
              signals.push({ text: isBenchmark ? "☢️ 裁判级踩踏信号" : "🧲 踩踏燃料", color: "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]" });
              scoreBreakdown.push({ reason: `极度高资金费率 (${isBenchmark ? '基准特权' : '山寨因子'})，易引发多头踩踏`, delta: fundingDelta });
          } else if (fundingRate < -0.001) {
              calculatedScore -= 20;
              signals.push({ text: "⚠️ 空头极度拥挤", color: "bg-red-500/20 text-red-400 border border-red-500/30" });
              scoreBreakdown.push({ reason: `极端负资金费率 (<-0.1%)，空头极度拥挤，极易被庄家暴力轧空`, delta: -20 });
          }
      }
    }

    if (!isCCI && bidVol > 0 && askVol > 0) {
      const buyImbalance = bidVol / askVol;
      const sellImbalance = askVol / bidVol;

      if (direction === 'long') {
          if (buyImbalance > 3) {
              calculatedScore += 10;
              signals.push({ text: "🧱 底部买盘强托", color: "bg-teal-500/20 text-teal-400 border border-teal-500/30" });
              scoreBreakdown.push({ reason: `订单薄顺风: 买盘厚度超卖盘 3倍以上，下方支撑极强`, delta: 10 });
          } else if (sellImbalance > 3) {
              calculatedScore -= 15;
              signals.push({ text: "⚠️ 上方卖盘压顶", color: "bg-red-500/20 text-red-400 border border-red-500/30" });
              scoreBreakdown.push({ reason: `订单薄逆风: 卖盘厚度超买盘 3倍以上，上方抛压极重`, delta: -15 });
          }
      } else if (direction === 'short') {
          if (sellImbalance > 3) {
              calculatedScore += 10;
              signals.push({ text: "🧱 顶部卖盘强压", color: "bg-teal-500/20 text-teal-400 border border-teal-500/30" });
              scoreBreakdown.push({ reason: `订单薄顺风: 卖盘厚度超买盘 3倍以上，上方抛压极强`, delta: 10 });
          } else if (buyImbalance > 3) {
              calculatedScore -= 15;
              signals.push({ text: "⚠️ 下方买盘强托", color: "bg-red-500/20 text-red-400 border border-red-500/30" });
              scoreBreakdown.push({ reason: `订单薄逆风: 买盘厚度超卖盘 3倍以上，下方支撑极强`, delta: -15 });
          }
      }
    }

    // [补丁 2] VPIN 订单流毒性的双向惩罚
    if (!isCCI) {
        if (direction === 'long') {
            if (takerAcceleration > 0.15) {
                calculatedScore += 15;
                scoreBreakdown.push({ reason: "VPIN 订单流毒性: 主买率短时内急剧飙升 (>15%)", delta: 15 });
                signals.push({ text: "☢️ VPIN 抢筹", color: "bg-teal-500/30 text-teal-300 border border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.5)] animate-pulse" });
            } else if (takerAcceleration < -0.15) {
                calculatedScore -= 20;
                scoreBreakdown.push({ reason: "逆势高危预警: 多头阵列中遭遇 VPIN 主卖率急剧飙升 (<-15%)", delta: -20 });
                signals.push({ text: "⚠️ VPIN 遭砸盘", color: "bg-red-500/30 text-red-300 border border-red-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse" });
            }
        } else if (direction === 'short') {
            if (takerAcceleration < -0.15) {
                calculatedScore += 15;
                scoreBreakdown.push({ reason: "VPIN 订单流毒性: 主卖率短时内急剧飙升 (<-15%)", delta: 15 });
                signals.push({ text: "☢️ VPIN 砸盘", color: "bg-rose-500/30 text-rose-300 border border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse" });
            } else if (takerAcceleration > 0.15) {
                calculatedScore -= 20;
                scoreBreakdown.push({ reason: "逆势高危预警: 空头阵列中遭遇 VPIN 主买率急剧飙升 (>15%)", delta: -20 });
                signals.push({ text: "⚠️ VPIN 遭抢筹", color: "bg-red-500/30 text-red-300 border border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" });
            }
        }
    }

    // [补丁 1] 宏观 CVD 顶底背离双向惩罚
    let cvdScoreBase = 25;
    if (volRegime === 'Trend_Following') cvdScoreBase = 40; 

    if (cvdDiv !== 'None') {
      const decayFactor = Math.exp(-0.4 * cvdDivAge); 
      const finalCvdScore = Math.round(cvdScoreBase * decayFactor);
      
      if (cvdDiv === 'Bullish') {
          if (direction === 'long') {
              calculatedScore += finalCvdScore;
              scoreBreakdown.push({ reason: `机构核心机密: CVD底背离 (T-${cvdDivAge} 放射性指数衰减 x${decayFactor.toFixed(2)})`, delta: finalCvdScore });
              signals.push({ text: `🚀 CVD底背离${cvdDivAge>0?`(T-${cvdDivAge})`:''}`, color: "bg-emerald-500/30 text-emerald-300 border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" });
          } else if (direction === 'short') {
              calculatedScore -= finalCvdScore;
              scoreBreakdown.push({ reason: `反向高危预警: 底部出现CVD底背离，巨鲸暗中托底，严禁追空`, delta: -finalCvdScore });
              signals.push({ text: `🛑 CVD底背离拦截`, color: "bg-red-500/30 text-red-300 border border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" });
          }
      } else if (cvdDiv === 'Bearish') {
          if (direction === 'short') {
              calculatedScore += finalCvdScore;
              scoreBreakdown.push({ reason: `机构核心机密: CVD顶背离 (T-${cvdDivAge} 放射性指数衰减 x${decayFactor.toFixed(2)})`, delta: finalCvdScore });
              signals.push({ text: `☄️ CVD顶背离${cvdDivAge>0?`(T-${cvdDivAge})`:''}`, color: "bg-red-500/30 text-red-300 border border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" });
          } else if (direction === 'long') {
              calculatedScore -= finalCvdScore;
              scoreBreakdown.push({ reason: `反向高危预警: 顶部出现CVD顶背离，巨鲸暗中派发，严禁追多`, delta: -finalCvdScore });
              signals.push({ text: `🛑 CVD顶背离拦截`, color: "bg-red-500/30 text-red-300 border border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" });
          }
      }
    }

    // [修复 1] VSA 必须使用已完全定型的上一根 K 线 (length - 2) 避免信号陷阱
    const completedIdx = Math.max(0, closes.length - 2);
    const volSlice = volumes.slice(Math.max(0, completedIdx - 20), completedIdx);
    const volMean = volSlice.reduce((a,b)=>a+b, 0) / (volSlice.length || 1);
    const volStdDev = Math.sqrt(volSlice.reduce((a,b)=>a+Math.pow(b-volMean,2),0) / (volSlice.length || 1)) || 1;
    const completedVol = volumes[completedIdx];
    const completedVolZScore = (completedVol - volMean) / volStdDev;

    const completedBody = Math.abs(closes[completedIdx] - opens[completedIdx]);
    const completedUpWick = highs[completedIdx] - Math.max(opens[completedIdx], closes[completedIdx]);
    const completedDnWick = Math.min(opens[completedIdx], closes[completedIdx]) - lows[completedIdx];
    
    // [补丁 4] VSA 针尖理论的多空攻防对称 (使用已定型的 completed 数据)
    if (completedVolZScore > 2.5 && completedBody < currentATR * 0.5 && !isCCI) { 
        if (direction === 'long') {
            if (completedUpWick > completedBody * 2) {
                calculatedScore -= 30; 
                scoreBreakdown.push({ reason: `VSA 模型防线: 前一完整K线天量长上影 (主力派发诱多，做多高危)`, delta: -30 });
                signals.push({ text: "⚠️ VSA诱多", color: "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" });
            } else if (completedDnWick > completedBody * 2) {
                calculatedScore += 20; 
                scoreBreakdown.push({ reason: `VSA 模型进攻: 前一完整K线天量长下影 (恐慌抛压被全数吸收，底部确认)`, delta: 20 });
                signals.push({ text: "🛡️ VSA探底吸收", color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse" });
            }
        } else if (direction === 'short') {
            if (completedDnWick > completedBody * 2) {
                calculatedScore -= 30; 
                scoreBreakdown.push({ reason: `VSA 模型防线: 前一完整K线天量长下影 (极大抛压被无痕吸收，做空高危)`, delta: -30 });
                signals.push({ text: "⚠️ VSA诱空", color: "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" });
            } else if (completedUpWick > completedBody * 2) {
                calculatedScore += 20; 
                scoreBreakdown.push({ reason: `VSA 模型进攻: 前一完整K线天量长上影 (买盘被限价卖单全数吸收，顶部确认)`, delta: 20 });
                signals.push({ text: "🛡️ VSA见顶派发", color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse" });
            }
        }
    }

    // [修复 2 准备] 计算用于 CVD 显微雷达的动态阈值，取代原本死板的 10 万 U
    let intervalMins = 240;
    if (interval === '15m') intervalMins = 15;
    else if (interval === '1h') intervalMins = 60;
    else if (interval === '1d') intervalMins = 1440;
    
    const avgVol100 = volumes.slice(-100).reduce((a,b)=>a+b, 0) / Math.min(100, volumes.length);
    const avgDollarVolPerCandle = avgVol100 * currentPrice;
    const baseline3mVol = avgDollarVolPerCandle * (3 / intervalMins);
    const dynamicCVDThreshold = Math.max(20000, baseline3mVol * 3);

    if (isFVGMagnet) {
      calculatedScore += 15;
      scoreBreakdown.push({ reason: "物理磁吸效应: 目标价落入未填补的 FVG 内", delta: 15 });
      signals.push({ text: "🧲 FVG 磁吸", color: "bg-blue-500/20 text-blue-400 border border-blue-500/50" });
    }

    let isLowLiquidity = false;
    if (!isBenchmark && !isCCI) {
      if (category === 'crypto') {
        const bars24h = interval === '15m' ? 96 : interval === '1h' ? 24 : interval === '4h' ? 6 : 1;
        const vol24hUSD = volumes.slice(-bars24h).reduce((a, b) => a + b, 0) * currentPrice;
        if (vol24hUSD > 0 && vol24hUSD < 2000000) {
          isLowLiquidity = true;
          calculatedScore -= 15;
          scoreBreakdown.push({ reason: "山寨流动性枯竭惩罚 (24h市值<200万)", delta: -15 });
        }
      }

      if (envData && envData.penalty > 0) {
        if (direction === 'long') {
          calculatedScore -= envData.penalty;
          scoreBreakdown.push({ reason: `响应${category}基准大盘(${envData.trend})逆风限制`, delta: -envData.penalty });
        } else if (direction === 'short') {
          const bonus = Math.round(envData.penalty / 2);
          calculatedScore += bonus;
          scoreBreakdown.push({ reason: `响应${category}基准大盘(${envData.trend})弱势顺风加成`, delta: bonus });
        }
      }
    }

    let confidenceMultiplier = 1.0;
    if (direction === 'long' && isBullishMS) confidenceMultiplier = 1.3;
    else if (direction === 'short' && isBearishMS) confidenceMultiplier = 1.3;
    else if (direction === 'long' && isBearishMS) confidenceMultiplier = 0.6;
    else if (direction === 'short' && isBullishMS) confidenceMultiplier = 0.6;
    
    if (volRegime === 'Mean_Reversion') {
        confidenceMultiplier *= 1.5; 
        scoreBreakdown.push({ reason: `赫斯特指数 H=${hurst.toFixed(2)} (均值回归市): 反转因子权重放大 1.5x`, delta: 0 });
    } else if (volRegime === 'Trend_Following') {
        confidenceMultiplier *= 0.5; 
        scoreBreakdown.push({ reason: `赫斯特指数 H=${hurst.toFixed(2)} (强趋势市): 反转因子易失效，权重强制缩减 50%`, delta: 0 });
    }

    if (isBenchmark) {
        confidenceMultiplier *= 1.5; 
        scoreBreakdown.push({ reason: `${displaySymbol} 预言机通道：宏观信度乘数开启 (x1.5)`, delta: 0 });
    }

    let foundTD9 = false;
    for (let i = 0; i < Math.min(4, tdData.length); i++) {
      const td = tdData[tdData.length - 1 - i];
      if (td && td.tdCount === 9) {
        const decayMultiplier = i === 0 ? 1 : i === 1 ? 0.6 : i === 2 ? 0.3 : 0.1;
        const tdDeltaBase = Math.round(15 * confidenceMultiplier * decayMultiplier);
        
        let tdDelta = 0;
        let tdReason = "";
        
        if (direction === 'long') {
            if (td.tdType === 'buy') {
                tdDelta = tdDeltaBase;
                tdReason = `TD9 底部反转共振 (多头阵列, 时效 T-${i})`;
            } else {
                tdDelta = -tdDeltaBase;
                tdReason = `TD9 顶部见顶预警 (多头阵列高危, 时效 T-${i})`;
            }
        } else {
            if (td.tdType === 'sell') {
                tdDelta = tdDeltaBase;
                tdReason = `TD9 顶部反转共振 (空头阵列, 时效 T-${i})`;
            } else {
                tdDelta = -tdDeltaBase;
                tdReason = `TD9 底部见底预警 (空头阵列高危, 时效 T-${i})`;
            }
        }

        calculatedScore += tdDelta;
        scoreBreakdown.push({ reason: tdReason, delta: tdDelta });
        
        if (i === 0) signals.push({ text: `${td.tdType === 'buy' ? 'BUY' : 'SELL'} 9 爆发`, color: td.tdType === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' });
        else signals.push({ text: `${td.tdType === 'buy' ? 'BUY' : 'SELL'} 9 余温 (T-${i})`, color: 'bg-gray-800 text-gray-400 border border-gray-700' });
        
        foundTD9 = true;
        break; 
      }
    }
    if (!foundTD9 && lastTd && lastTd.tdCount >= 8) {
      signals.push({ text: `${lastTd.tdType === 'buy' ? 'BUY' : 'SELL'} ${lastTd.tdCount}`, color: lastTd.tdType === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50' });
    }

    if (lastTd && lastTd.isAbsorption && !isBullishAbsorption && !isBearishAbsorption) {
      const absDelta = Math.round(20 * confidenceMultiplier);
      if (direction === 'long') {
          if (lastTd.tdType === 'buy') {
              calculatedScore += absDelta;
              scoreBreakdown.push({ reason: `L4 核级底部单K线吸收 (综合乘数 x${confidenceMultiplier.toFixed(2)})`, delta: absDelta });
              signals.push({ text: "🧊 底部单K吸收", color: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse" });
          } else {
              calculatedScore -= absDelta;
              scoreBreakdown.push({ reason: `L4 核级顶部单K线吸收预警 (防追高惩罚)`, delta: -absDelta });
              signals.push({ text: "⚠️ 顶部吸收高危", color: "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse" });
          }
      } else {
          if (lastTd.tdType === 'sell') {
              calculatedScore += absDelta;
              scoreBreakdown.push({ reason: `L4 核级顶部单K线吸收 (综合乘数 x${confidenceMultiplier.toFixed(2)})`, delta: absDelta });
              signals.push({ text: "🧊 顶部单K吸收", color: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse" });
          } else {
              calculatedScore -= absDelta;
              scoreBreakdown.push({ reason: `L4 核级底部单K线吸收预警 (防追空惩罚)`, delta: -absDelta });
              signals.push({ text: "⚠️ 底部吸收高危", color: "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse" });
          }
      }
    }

    if (isFOMO) {
      calculatedScore -= 15;
      signals.push({ text: direction === 'long' ? "追高高危" : "追空高危", color: "bg-red-900/50 text-red-400 border border-red-500/50" });
      scoreBreakdown.push({ reason: "现价严重偏离结构极值防线 (防追高机制)", delta: -15 });
    }

    if (isSMCResonance) {
      const smcDelta = Math.round(20 * confidenceMultiplier);
      calculatedScore += smcDelta; 
      signals.push({ text: "🩸猎杀流动性", color: "bg-rose-900/40 text-rose-400 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse" });
      scoreBreakdown.push({ reason: `机构级SMC猎杀提纯OB (综合乘数 x${confidenceMultiplier.toFixed(2)})`, delta: smcDelta });

      // MTF 跨周期共振 (修正双向)
      if (is15mPump && direction === 'long') {
          calculatedScore += 15;
          scoreBreakdown.push({ reason: "马尔可夫 MTF 共振: 15m级多头起飞伴随宏观 SMC 流动性猎杀完成", delta: 15 });
          signals.push({ text: "🌊 跨周期共振(多)", color: "bg-cyan-500/30 text-cyan-300 border border-cyan-400 animate-pulse" });
      } else if (is15mDump && direction === 'short') {
          calculatedScore += 15;
          scoreBreakdown.push({ reason: "马尔可夫 MTF 共振: 15m级空头瀑布伴随宏观 SMC 流动性猎杀完成", delta: 15 });
          signals.push({ text: "🌊 跨周期共振(空)", color: "bg-purple-500/30 text-purple-300 border border-purple-400 animate-pulse" });
      }
    }

    if (isOverExtendedStruct) {
      if (isSentinelExtreme) {
        scoreBreakdown.push({ reason: "极值猎杀特赦: 豁免价格严重偏离宏观结构极值惩罚", delta: 0 });
      } else {
        signals.push({ text: "极端偏离区", color: "bg-red-900/50 text-red-400 border border-red-500/50" });
        calculatedScore -= 40;
        scoreBreakdown.push({ reason: "价格严重偏离宏观结构极值 (均值回归风险极高)", delta: -40 });
      }
    }

    let trendScore = 0;
    if (direction === 'long' && isBullishMS) {
      const trendDelta = Math.round(15 * volLoadFactor);
      trendScore += trendDelta; calculatedScore += trendDelta;
      signals.push({ text: chochSignal.includes('Bullish') ? "🚨 牛市反转(CHoCH)" : "📈 结构看多(BOS)", color: "bg-green-500/20 text-green-400 border border-green-500/50" });
      scoreBreakdown.push({ reason: `无指标纯裸K验证: 多头结构牢固 (GARCH 波动率载荷 x${volLoadFactor.toFixed(1)})`, delta: trendDelta });
    } else if (direction === 'short' && isBearishMS) {
      const trendDelta = Math.round(15 * volLoadFactor);
      trendScore += trendDelta; calculatedScore += trendDelta;
      signals.push({ text: chochSignal.includes('Bearish') ? "🚨 熊市反转(CHoCH)" : "📉 结构看空(BOS)", color: "bg-red-500/20 text-red-400 border border-red-500/50" });
      scoreBreakdown.push({ reason: `无指标纯裸K验证: 空头结构牢固 (GARCH 波动率载荷 x${volLoadFactor.toFixed(1)})`, delta: trendDelta });
    } else if (direction === 'long' && isBearishMS) {
      if (isSentinelExtreme) {
        calculatedScore += 10;
        signals.push({ text: "💎 左侧摸底特赦", color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" });
        scoreBreakdown.push({ reason: "左侧极寒特赦: 允许在绝望深渊中逆势摸底", delta: 10 });
      } else {
        calculatedScore -= 20;
        signals.push({ text: "逆势做多(看空)", color: "bg-orange-500/20 text-orange-400 border border-orange-500/50" });
        scoreBreakdown.push({ reason: "逆势操作惩罚: 当前裸K结构处于 Bearish 状态", delta: -20 });
      }
    } else if (direction === 'short' && isBullishMS) {
      if (isSentinelExtreme) {
        calculatedScore += 10;
        signals.push({ text: "🚨 左侧摸顶特赦", color: "bg-rose-500/20 text-rose-400 border border-rose-500/50" });
        scoreBreakdown.push({ reason: "左侧极寒特赦: 允许在狂暴牛市中逆势摸顶", delta: 10 });
      } else {
        calculatedScore -= 20;
        signals.push({ text: "逆势做空(看多)", color: "bg-orange-500/20 text-orange-400 border border-orange-500/50" });
        scoreBreakdown.push({ reason: "逆势操作惩罚: 当前裸K结构处于 Bullish 状态", delta: -20 });
      }
    }

    const distToPoc = (currentPrice - pocPrice) / pocPrice;
    if (direction === 'long') {
        if (distToPoc >= 0 && distToPoc <= 0.02) {
            calculatedScore += 10;
            signals.push({ text: "踩稳POC铁底", color: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" });
            scoreBreakdown.push({ reason: "精准回踩 POC 主力成本区 (强力支撑)", delta: 10 });
        } else if (distToPoc < 0 && distToPoc >= -0.02) {
            calculatedScore -= 15;
            signals.push({ text: "⚠️多在天花板", color: "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" });
            scoreBreakdown.push({ reason: "量化大忌: 现价被 POC 铁墙死死压制，严禁在天花板下做多", delta: -15 });
        }
    } else if (direction === 'short') {
        if (distToPoc <= 0 && distToPoc >= -0.02) {
            calculatedScore += 10;
            signals.push({ text: "反抽POC压顶", color: "bg-purple-500/20 text-purple-400 border border-purple-500/30" });
            scoreBreakdown.push({ reason: "精准反抽 POC 泰山压顶 (绝佳空点)", delta: 10 });
        } else if (distToPoc > 0 && distToPoc <= 0.02) {
            calculatedScore -= 15;
            signals.push({ text: "⚠️空在铁底", color: "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" });
            scoreBreakdown.push({ reason: "量化大忌: 现价正踩在 POC 铁墙支撑上，严禁空在底部", delta: -15 });
        }
    }

    // [修复 3] 平滑阶梯式对数化盈亏比打分，取消动辄 -30 分的“连环鞭尸”
    if (rrr < 1.5) {
      if (trendScore >= 15 && !isOverExtendedStruct) {
        calculatedScore -= 5;
        scoreBreakdown.push({ reason: "盈亏比偏低 < 1.5 (强势趋势豁免大部分扣分)", delta: -5 });
      } else {
        calculatedScore -= 15;
        scoreBreakdown.push({ reason: "盈亏比逆风区: 盈亏比 < 1.5，容错率低", delta: -15 });
      }
    } else if (rrr >= 1.5 && rrr < 2.5) {
      calculatedScore -= 5;
      scoreBreakdown.push({ reason: `慢性放血区: 盈亏比 ${rrr.toFixed(1)}x (<2.5)，略有损耗`, delta: -5 });
    } else if (rrr >= 2.5 && rrr < 4.0) {
      scoreBreakdown.push({ reason: `及格中性区: 盈亏比 ${rrr.toFixed(1)}x，保持中立`, delta: 0 });
    } else if (rrr >= 4.0) {
      // 边际效用递减: log2(4/2)=1加5分, log2(8/2)=2加10分, 极限封顶15分
      const rrrLogBonus = Math.min(15, Math.round(Math.log2(rrr / 2) * 5));
      calculatedScore += rrrLogBonus;
      scoreBreakdown.push({ reason: `优质奖励区: 盈亏比 ${rrr.toFixed(1)}x (对数边际递减)`, delta: rrrLogBonus });
    }

    const mcWinRate = parseFloat(mcResults.targetProb);
    const mcLossRate = parseFloat(mcResults.stopProb);
    const avgSteps = mcResults.avgTargetSteps || mcSteps;
    
    // [修复 3] 期望值统御 (软化负面期望的绝对死刑，保留优质指标救场的可能)
    const expectancy = (mcWinRate / 100) * rrr - (mcLossRate / 100) * 1; 

    if (expectancy < 0 && !isCCI) {
      if (isSentinelExtreme) {
        scoreBreakdown.push({ reason: "极值猎杀特赦: 豁免蒙特卡洛右侧趋势惯性的负期望惩罚", delta: 0 });
      } else {
        calculatedScore -= 15;
        scoreBreakdown.push({ reason: `数学期望为负 (每承担1风险单位，预期亏损 ${Math.abs(expectancy).toFixed(2)})`, delta: -15 });
        signals.push({ text: "☠️ 负期望陷阱", color: "bg-red-950 text-red-300 border border-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]" });
      }
    } else if (expectancy > 0.5) {
      const expBonus = Math.min(20, Math.round(expectancy * 12));
      calculatedScore += expBonus;
      scoreBreakdown.push({ reason: `正向数学期望统御 (预期收益 ${expectancy.toFixed(2)} / 风险单位)`, delta: expBonus });
      signals.push({ text: "💎 高期望标的", color: "bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse" });
    }

    const timeAdjustedExpectancy = expectancy / avgSteps;
    if (expectancy > 0 && timeAdjustedExpectancy < 0.01 && avgSteps > (mcSteps * 0.8) && !isCCI) {
       calculatedScore -= 10;
       scoreBreakdown.push({ reason: `资金磨损惩罚: 预期需 ${Math.round(avgSteps)} 周期达成，时间流转效率极低`, delta: -10 });
       signals.push({ text: "⏳ 盘整磨损", color: "bg-gray-800 text-gray-400 border border-gray-700" });
    }

    if (direction === 'neutral' && !isBenchmark && !isCCI) {
        if (beta > 0.4) {
            calculatedScore -= 30;
            scoreBreakdown.push({ reason: "混沌期高 Beta 惩罚 (仅允许独立 Alpha 存活)", delta: -30 });
        } else {
            calculatedScore += 10;
            scoreBreakdown.push({ reason: "混沌期低 Beta 奖励 (独立 Alpha 避险属性)", delta: 10 });
            signals.push({ text: "🛡️ 独立避风港", color: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50" });
        }
    }

    if (isLowLiquidity && calculatedScore > 75) {
      scoreBreakdown.push({ reason: "流动性安全锁 (最高封顶 75分)", delta: -(Math.round(calculatedScore) - 75) });
      calculatedScore = 75;
    }

    // 统一归置 Kelly 到期望值体系下
    let kellyPctFinal = expectancy > 0 ? (expectancy / rrr) : 0;

    if (kellyPctFinal <= 0 && !isCCI) {
        // [逻辑刺客 1 修复] 抹除“只惩罚高分导致分数倒挂”的降级悖论，采用统一扣分，保持单调性公信力
        if (!isSentinelExtreme) {
            const expectPenalty = 15;
            scoreBreakdown.push({ reason: "凯利数学期望为负 (剥夺极品预警评级，执行统一下调)", delta: -expectPenalty });
            calculatedScore -= expectPenalty;
        } else {
            scoreBreakdown.push({ reason: "极值猎杀特赦: 豁免凯利期望降级，信任左侧赔率", delta: 0 });
        }
    }

    const finalScoreDelta = calculatedScore - 50;
    const kSmooth = 0.03; 
    let finalScoreValue = 50;
    
    if (finalScoreDelta > 0) {
        finalScoreValue = 50 + 50 * (1 - Math.exp(-kSmooth * finalScoreDelta));
    } else if (finalScoreDelta < 0) {
        finalScoreValue = 50 - 50 * (1 - Math.exp(-kSmooth * Math.abs(finalScoreDelta)));
    }
    
    const score = Math.min(100, Math.max(0, Math.round(finalScoreValue)));

    return {
      symbol, currentPrice, score, signals, scoreBreakdown, chartData: chartFormatData, vpvrData, mcResults, buyWall, direction,
      tdData, liqClusters, lastTd, 
      plan: { entryPoint: entryForRRR, entryType, pocPrice: pocPrice, smcOB, stopLoss, target: targetPrice, rrr: rrr.toFixed(2), riskPercent: (Math.abs(entryForRRR - stopLoss) / entryForRRR * 100).toFixed(1) },
      metrics: { rawAtr: currentATR, atr: currentATR.toPrecision(3), bbw: (currentBBW * 100).toFixed(1) + '%', beta: beta.toFixed(2), takerBuyRatio: (takerBuyRatio * 100).toFixed(1) + '%', vpinAccel: (takerAcceleration * 100).toFixed(1) + '%', cvdThreshold: dynamicCVDThreshold, profileShape },
      rrrDetails 
    };
  }, []);

  const evaluateMarketRegime = (btcKlines, name = 'BTC') => {
    if (!btcKlines || btcKlines.length < 145) return { trend: '未知', penalty: 0, color: 'text-gray-400', isBearish: false, regimeType: 'neutral' };
    
    const closes = btcKlines.map(k => parseFloat(k[4]));
    const highs = btcKlines.map(k => parseFloat(k[2]));
    const lows = btcKlines.map(k => parseFloat(k[3]));
    const vols = btcKlines.map(k => parseFloat(k[5]));
    const takerBuys = btcKlines.map(k => parseFloat(k[9]));
    
    const currentBTC = closes[closes.length - 1];
    
    // 算力下沉：计算基准标的结构状态 (V20 MS Engine)
    const pivots = [];
    const pLen = 5;
    for (let i = pLen; i < closes.length - pLen; i++) {
       let isPH = true, isPL = true;
       for (let j = 1; j <= pLen; j++) {
           if (highs[i - j] >= highs[i] || highs[i + j] >= highs[i]) isPH = false;
           if (lows[i - j] <= lows[i] || lows[i + j] <= lows[i]) isPL = false;
       }
       if (isPH) pivots.push({ type: 'PH', price: highs[i] });
       if (isPL) pivots.push({ type: 'PL', price: lows[i] });
    }
    
    let msState = 'Neutral'; 
    let lastHH = -Infinity, lastHL = -Infinity;
    let lastLH = Infinity, lastLL = Infinity;
    for (let p of pivots) {
        if (p.type === 'PH') {
            if (p.price > lastHH) { msState = 'Bullish'; lastHH = p.price; } 
            else { lastLH = p.price; }
        } else {
            if (p.price < lastLL) { msState = 'Bearish'; lastLL = p.price; } 
            else { lastHL = p.price; }
        }
    }
    if (msState === 'Bullish' && currentBTC < lastHL) msState = 'Bearish';
    if (msState === 'Bearish' && currentBTC > lastLH) msState = 'Bullish';

    const atrArray = calculateATR(highs, lows, closes, 14);
    const atrCurrent = atrArray[atrArray.length - 1];
    
    let cvd = 0;
    const cvdArr = [];
    for (let i = 0; i < btcKlines.length; i++) {
       cvd += (takerBuys[i] - (vols[i] - takerBuys[i]));
       cvdArr.push(cvd);
    }
    const p10 = Math.max(0, closes.length - 10);
    const priceHH = highs[closes.length - 1] >= Math.max(...highs.slice(p10, closes.length - 1));
    const cvdLH = cvdArr[cvdArr.length - 1] < Math.max(...cvdArr.slice(p10, cvdArr.length - 1));
    const isDailyCVDTopDiv = priceHH && cvdLH; 
    
    let trend = `${name}结构健康`;
    let penalty = 0;
    let color = 'text-green-400';
    let isBearish = false;
    let regimeType = 'bull'; 
    
    if (msState === 'Bearish') {
        if (currentBTC < lastLL - atrCurrent) {
            trend = `${name}深熊结构 (跌破前低 LL)`; penalty = 30; color = 'text-red-500'; isBearish = true; regimeType = 'bear';
        } else {
            trend = `${name}空头主导 (反弹 LH 阻力)`; penalty = 15; color = 'text-orange-400'; isBearish = true; regimeType = 'bear';
        }
    } else if (msState === 'Bullish') {
        if (currentBTC > lastHH + atrCurrent) {
            trend = `${name}极度狂热 (突破前高 HH)`; penalty = 10; color = 'text-yellow-400'; isBearish = false; regimeType = 'bull';
        } else {
            if (isDailyCVDTopDiv) { trend = `${name}高危滞涨 (日线资金流出)`; penalty = 15; color = 'text-orange-400'; isBearish = true; regimeType = 'neutral'; }
            else { trend = `${name}多头结构 (回踩 HL 支撑)`; penalty = 0; color = 'text-green-400'; isBearish = false; regimeType = 'bull'; }
        }
    } else {
        trend = `${name}混沌震荡 (无清晰阶梯)`; penalty = 20; color = 'text-gray-400'; isBearish = false; regimeType = 'neutral';
    }
    
    return { trend, penalty, color, isBearish, regimeType };
  };

  const toggleSentinel = async () => {
    if (!isSentinelRunning) {
      if ("Notification" in window && Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
      setIsSentinelRunning(true);
      sentinelRunningRef.current = true;
    } else {
      setIsSentinelRunning(false);
      sentinelRunningRef.current = false;
    }
  };

  const runSentinelScan = useCallback(async () => {
    if (!sentinelRunningRef.current) return;

    try {
        // 第一阶段：全局宏观动量扫描与数据预载 (24h Ticker 寻找极性标的)
        const tickRes = await safeFetch('https://api.binance.com/api/v3/ticker/24hr').catch(()=>null);
        let binanceTargets = [];
        let btcChange = 0;

        // 获取全网资金费率，用于第二阶段“杀猪”过滤
        const fapiRes = await safeFetch('https://fapi.binance.com/fapi/v1/premiumIndex').catch(()=>null);
        let fundingMap = {};
        if (fapiRes && fapiRes.ok) {
            const fData = await fapiRes.json();
            fData.forEach(item => fundingMap[item.symbol] = parseFloat(item.lastFundingRate));
        }

        if (tickRes && tickRes.ok) {
            const tickers = await tickRes.json();
            const btcTicker = tickers.find(t => t.symbol === 'BTCUSDT');
            if (btcTicker) btcChange = parseFloat(btcTicker.priceChangePercent);

            binanceTargets = tickers
                .filter(t => t.symbol.endsWith('USDT') && t.symbol !== 'BTCUSDT')
                .sort((a,b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                .slice(0, 30).map(t => ({ 
                    symbol: t.symbol, 
                    isHL: false, 
                    rawName: t.symbol.replace('USDT', ''),
                    change24h: parseFloat(t.priceChangePercent),
                    funding: fundingMap[t.symbol] || 0
                }));
        }

        let hlTargets = [];
        const hlRes = await fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ type: "metaAndAssetCtxs" }) }).catch(()=>null);
        if (hlRes && hlRes.ok) {
            const hlData = await hlRes.json();
            const meta = hlData[0]; const ctxs = hlData[1];
            const combined = meta.universe.map((u, i) => {
                const markPx = parseFloat(ctxs[i].markPx);
                const prevPx = parseFloat(ctxs[i].prevDayPx);
                const change = prevPx > 0 ? ((markPx - prevPx) / prevPx) * 100 : 0;
                return { name: u.name, vol: parseFloat(ctxs[i].dayNtlVlm), change24h: change, funding: parseFloat(ctxs[i].funding) * 100 * 3 }; 
            });
            hlTargets = combined.sort((a,b) => b.vol - a.vol).slice(0, 15).map(t => ({ 
                symbol: `HL:${t.name}`, 
                isHL: true, 
                rawName: t.name,
                change24h: t.change24h,
                funding: t.funding
            }));
        }

        const allTargets = [...binanceTargets, ...hlTargets];
        if (allTargets.length === 0) return;

        // =========================================
        // 漏斗过滤核心算法 (MTF Engine)
        // =========================================
        
        allTargets.forEach(t => t.rs = t.change24h - btcChange);
        allTargets.sort((a, b) => b.rs - a.rs); 

        const topCount = Math.max(5, Math.floor(allTargets.length * 0.2));
        const topLongs = allTargets.slice(0, topCount); 
        const bottomShorts = allTargets.slice(-topCount); 

        const qualifiedShorts = topLongs.filter(t => t.funding >= 0.0001).map(t => ({...t, targetDir: 'short'}));
        const qualifiedLongs = bottomShorts.filter(t => t.funding <= 0.0001).map(t => ({...t, targetDir: 'long'}));

        const finalCandidates = [...qualifiedLongs, ...qualifiedShorts];

        // 🌟 载入大盘 15m, 1h, 1d 基准验证 (MTF共振核心)
        const [btcKlines15m, btcKlines1h, btcKlines1d] = await Promise.all([
            fetchBenchmark('BTCUSDT', '15m', 150),
            fetchBenchmark('BTCUSDT', '1h', 150),
            fetchBenchmark('BTCUSDT', '1d', 150)
        ]);
        const env15m = evaluateMarketRegime(btcKlines15m, 'BTC');

        for (let i = 0; i < finalCandidates.length; i++) {
            if (!sentinelRunningRef.current) break;
            const { symbol, isHL, rawName, targetDir, funding } = finalCandidates[i];

            // 第一道漏斗：15分钟级别高频扫描火力侦察
            let klines15m = null;
            if (!isHL) klines15m = await safeFetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=150`).then(r => r.json()).catch(()=>null);
            else klines15m = await hlFetchKlines(rawName, '15m', 150);

            if (!klines15m || klines15m.length < 100) continue;

            const analysis15m = analyzeKlines(symbol, klines15m, btcKlines15m, null, null, funding, 0, env15m, '15m', targetDir, 'crypto', false, true);
            if (!analysis15m || parseFloat(analysis15m.metrics.beta) > 0.7) continue;

            // 发报扳机：15m 触发极值，且伴随强资金流或订单块支撑
            if (analysis15m.score >= 70 && (analysis15m.plan.smcOB || analysis15m.signals.some(s => s.text.includes('CVD') || s.text.includes('VSA') || s.text.includes('VPIN')))) {
                
                // 🚨 触发 15m 警报！懒加载 1H 和 1D 进行跨周期(MTF)共振核验
                let klines1h = null, klines1d = null;
                if (!isHL) {
                    [klines1h, klines1d] = await Promise.all([
                        safeFetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=150`).then(r => r.json()).catch(()=>null),
                        safeFetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=150`).then(r => r.json()).catch(()=>null)
                    ]);
                } else {
                    [klines1h, klines1d] = await Promise.all([
                        hlFetchKlines(rawName, '1h', 150),
                        hlFetchKlines(rawName, '1d', 150)
                    ]);
                }

                let tags = [];
                
                // 核验 1H 共振
                if (klines1h && klines1h.length >= 100) {
                    const env1h = evaluateMarketRegime(btcKlines1h, 'BTC');
                    const analysis1h = analyzeKlines(symbol, klines1h, btcKlines1h, null, null, funding, 0, env1h, '1h', targetDir, 'crypto', false, true);
                    if (analysis1h) {
                        if (analysis1h.score >= 60) tags.push(`[🌊1H${targetDir==='long'?'多头':'空头'}共振]`);
                        if (analysis1h.plan.smcOB) tags.push(`[🎯1H极值区]`);
                    }
                }

                // 核验 1D 共振
                if (klines1d && klines1d.length >= 100) {
                    const env1d = evaluateMarketRegime(btcKlines1d, 'BTC');
                    const analysis1d = analyzeKlines(symbol, klines1d, btcKlines1d, null, null, funding, 0, env1d, '1d', targetDir, 'crypto', false, true);
                    if (analysis1d) {
                        if (analysis1d.score >= 60) tags.push(`[🌋1D大势共振]`);
                        if (analysis1d.plan.smcOB) {
                            tags.push(targetDir === 'long' ? `[🛡️1D铁底支撑]` : `[🧱1D铁顶压制]`);
                        }
                        if (analysis1d.rrrDetails.msState.includes(targetDir==='long'?'Bullish':'Bearish')) tags.push(`[📈日线顺风]`);
                        
                        const shape = analysis1d.metrics.profileShape;
                        if (shape === 'b型') tags.push(`[🛡️b型兜底(1D)]`);
                        else if (shape === 'P型') tags.push(`[🧱P型压顶(1D)]`);
                        else if (shape === 'D型') tags.push(`[⚖️D型平衡(1D)]`);
                    }
                }

                if (tags.length === 0) tags.push(`[💨无大周期共振(短线)]`);

                // 🌟 V2 严苛的多空同向共振引擎 (Strict Resonance Engine)
                let isStar = false;
                let hasFatalConflict = false; // 致命多空冲突标记
                
                // 1H 顺风判定
                const has1HResonance = tags.some(t => t.includes(`1H${targetDir === 'long' ? '多头' : '空头'}共振`) || t.includes('1H极值区'));
                const has1DMacro = tags.some(t => t.includes('1D大势') || t.includes('日线顺风'));

                if (targetDir === 'long') {
                    const has1DSupport = tags.some(t => t.includes('铁底支撑') || t.includes('b型'));
                    const has1DResistance = tags.some(t => t.includes('P型')); // 做多时遇到宏观P型压顶，判定为死劫
                    if (has1DResistance) hasFatalConflict = true;
                    
                    // 完美做多共振：1H顺风 + (1D大势顺风 或 1D有强底) 且 没有遭遇宏观逆风压制
                    if (has1HResonance && (has1DMacro || has1DSupport) && !hasFatalConflict) isStar = true;
                } else {
                    const has1DResistance = tags.some(t => t.includes('铁顶压制') || t.includes('P型'));
                    const has1DSupport = tags.some(t => t.includes('b型')); // 做空时遇到宏观b型托底，判定为死劫
                    if (has1DSupport) hasFatalConflict = true;
                    
                    // 完美做空共振：1H顺风 + (1D大势顺风 或 1D有强压) 且 没有遭遇宏观逆风托底
                    if (has1HResonance && (has1DMacro || has1DResistance) && !hasFatalConflict) isStar = true;
                }

                const tagsStr = tags.join(' ');
                const title = targetDir === 'long' 
                  ? `💎 [血筹建仓] ${symbol.replace(/USDT|HL:/g,'')} 15m 触发终极伏击` 
                  : `🚨 [极寒逃顶] ${symbol.replace(/USDT|HL:/g,'')} 15m 触发高位派发`;
                
                const desc = targetDir === 'long' 
                  ? `${tagsStr} 15m级别回踩SMC订单块，巨鲸暗中吸筹！(评分: ${analysis15m.score})` 
                  : `${tagsStr} 15m级别触及主力防线，巨鲸出现派发！(评分: ${analysis15m.score})`;
                
                setAlerts(prev => {
                    const isDup = prev.some(p => p.symbol === symbol && p.type === targetDir && (Date.now() - p.timestamp < 7200000));
                    if (isDup) return prev;
                    if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body: desc, icon: 'https://cdn-icons-png.flaticon.com/512/3260/3260867.png' });
                    return [{ id: Date.now() + Math.random(), timestamp: Date.now(), symbol, price: analysis15m.currentPrice, type: targetDir, score: analysis15m.score, title, desc, isHL, tags, isStar }, ...prev].slice(0, 100);
                });
            }
            await new Promise(r => setTimeout(r, 300));
        }
    } catch(e) {}
  }, [analyzeKlines]);

  useEffect(() => {
    let intervalId;
    if (isSentinelRunning) {
      runSentinelScan(); 
      intervalId = setInterval(() => { runSentinelScan(); }, 15 * 60 * 1000); 
    }
    return () => clearInterval(intervalId);
  }, [isSentinelRunning, runSentinelScan]);

  const scanMarket = async (forceRestart = false) => {
    if (isScanning && !forceRestart) return;
    
    const currentScanId = ++scanIdRef.current; 
    setIsScanning(true);
    setProgress(0);
    setMarketEnv(null);

    try {
      const tickRes = await safeFetch('https://api.binance.com/api/v3/ticker/24hr');
      if (tickRes && tickRes.ok) {
        const tickers = await tickRes.json();
        const usdtTickers = tickers
          .filter(t => t.symbol.endsWith('USDT') && t.symbol !== 'BTCUSDT')
          .sort((a,b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
        const ranks = {};
        usdtTickers.forEach((t, i) => ranks[t.symbol] = i + 1);
        setCoinRanks(ranks);
      }
    } catch (e) {}

    let currentEnv = { trend: '未知', penalty: 0, color: 'text-gray-400', regimeType: 'bull' };
    let activeDirection = tradeDirection === 'neutral' ? 'long' : tradeDirection; 
    
    const benchmarkSymbols = { crypto: 'BTCUSDT', equity: 'NDX', commodity: 'GOLD', forex: 'EURUSD' };
    const envs = {};
    const intKlines = {};

    try {
      await Promise.all(Object.entries(benchmarkSymbols).map(async ([cat, sym]) => {
        const k1d = await fetchBenchmark(sym, '1d', 150);
        const kInt = await fetchBenchmark(sym, klineInterval, 200);
        if (k1d && k1d.length >= 145) {
          envs[cat] = evaluateMarketRegime(k1d, sym.replace('USDT', ''));
        } else {
          envs[cat] = { trend: '未知', penalty: 0, color: 'text-gray-400', regimeType: 'neutral' };
        }
        intKlines[cat] = kInt;
      }));

      currentEnv = envs.crypto || currentEnv;

      if (!hasAutoSetDirectionRef.current && currentEnv.regimeType) {
        const autoDir = currentEnv.regimeType === 'bear' ? 'short' : currentEnv.regimeType === 'neutral' ? 'neutral' : 'long';
        if (autoDir !== tradeDirection) {
          setTradeDirection(autoDir);
          activeDirection = autoDir === 'neutral' ? 'long' : autoDir;
        }
        hasAutoSetDirectionRef.current = true;
      }
    } catch (e) {}
    setMarketEnv(currentEnv);

    const scannedData = [];
    const newChartCache = {};
    const allKlinesForCCI = []; 

    const evalDirection = tradeDirection === 'neutral' ? 'neutral' : tradeDirection;

    for (let i = 0; i < coins.length; i++) {
      if (currentScanId !== scanIdRef.current) return; 

      const symbol = coins[i]; 
      let klines = null, k15m = null, depth = null, fundingRate = 0.0001, openInterest = 0;
      let isHyperliquidNode = false;
      
      const isDirectHL = symbol.startsWith('HL:');
      const searchSymbol = isDirectHL ? symbol.replace('HL:', '') : symbol;
      let actualSymbolUsed = searchSymbol; 

      try {
        let klinesRes = null;
        if (!isDirectHL) {
          klinesRes = await safeFetch(`https://api.binance.com/api/v3/klines?symbol=${searchSymbol}&interval=${klineInterval}&limit=200`).catch(()=>null);
        }
        
        if (klinesRes && klinesRes.ok) {
          klines = await klinesRes.json();
          actualSymbolUsed = searchSymbol;
          const [k15mRes, depthRes, fapiRes, oiRes] = await Promise.all([
            safeFetch(`https://api.binance.com/api/v3/klines?symbol=${searchSymbol}&interval=15m&limit=50`).catch(()=>null),
            safeFetch(`https://api.binance.com/api/v3/depth?symbol=${searchSymbol}&limit=100`).catch(()=>null),
            safeFetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${searchSymbol}`).catch(() => null),
            safeFetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${searchSymbol}`).catch(() => null)
          ]);

          if (k15mRes && k15mRes.ok) k15m = await k15mRes.json();
          if (depthRes && depthRes.ok) depth = await depthRes.json();
          if (fapiRes && fapiRes.ok) fundingRate = parseFloat((await fapiRes.json()).lastFundingRate || 0);
          if (oiRes && oiRes.ok) openInterest = parseFloat((await oiRes.json()).openInterest || 0);
        } else {
          isHyperliquidNode = true;
          
          let hlTarget = searchSymbol;
          const stripped = searchSymbol.replace(/USDT|USDC/g, ''); 
          
          if (hlDictionary[searchSymbol]) hlTarget = hlDictionary[searchSymbol];
          else if (hlDictionary[stripped]) hlTarget = hlDictionary[stripped]; 
          else hlTarget = isDirectHL ? searchSymbol : stripped; 

          klines = await hlFetchKlines(hlTarget, klineInterval, 200);
          
          if (!klines && !hlTarget.includes(':')) {
              const darkTarget = `xyz:${hlTarget}`; 
              klines = await hlFetchKlines(darkTarget, klineInterval, 200);
              if (klines) hlTarget = darkTarget; 
          }

          if (klines && klines.length >= 100) { 
            actualSymbolUsed = hlTarget; 
            k15m = await hlFetchKlines(hlTarget, '15m', 50).catch(()=>null);
            const l2Res = await fetch('https://api.hyperliquid.xyz/info', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: "l2Book", coin: hlTarget })
            }).catch(()=>null);
            
            if (l2Res && l2Res.ok) {
              const l2 = await l2Res.json();
              if (l2 && l2.levels && l2.levels.length >= 2) {
                 depth = { bids: l2.levels[0].map(b => [b.px, b.sz]), asks: l2.levels[1].map(a => [a.px, a.sz]) };
              }
            }
          }
        }

        if (!klines || klines.length < 100) {
           setProgress(((i + 1) / coins.length) * 100);
           continue; 
        }
        
        allKlinesForCCI.push({ symbol: actualSymbolUsed, rawData: klines }); 
        
        const category = getAssetCategory(actualSymbolUsed);
        const isBenchmark = Object.values(benchmarkSymbols).includes(actualSymbolUsed) || actualSymbolUsed === 'BTCUSDT';
        const bmkKlines = intKlines[category] || intKlines['crypto'];
        const bmkEnv = envs[category] || currentEnv;

        const analysis = analyzeKlines(symbol, klines, bmkKlines, k15m, depth, fundingRate, openInterest, bmkEnv, klineInterval, evalDirection, category, isBenchmark);
        if (analysis) {
          analysis.isHL = isHyperliquidNode; 
          analysis.actualSymbol = actualSymbolUsed; 
          scannedData.push(analysis);
          newChartCache[symbol] = analysis.chartData;
        }
      } catch (err) {}
      
      if (currentScanId !== scanIdRef.current) return; 
      setProgress(((i + 1) / coins.length) * 100);
      await new Promise(res => setTimeout(res, 200)); 
    }

    if (allKlinesForCCI.length > 0 && currentScanId === scanIdRef.current) {
        const cciRaw = buildCompositeIndex(allKlinesForCCI);
        const cciAnalysis = analyzeKlines('CCI', cciRaw, intKlines['crypto'], null, null, 0.0001, 0, currentEnv, klineInterval, evalDirection, 'crypto', true);
        if (cciAnalysis) {
            cciAnalysis.isHL = false;
            cciAnalysis.actualSymbol = 'CCI';
            scannedData.push(cciAnalysis);
            newChartCache['CCI'] = cciAnalysis.chartData;
        }
    }

    if (currentScanId === scanIdRef.current) {
      const validScores = scannedData.filter(d => d.symbol !== 'CCI').map(d => d.score);
      const meanScore = validScores.length > 0 ? validScores.reduce((a,b)=>a+b,0) / validScores.length : 50;
      const stdDevScore = validScores.length > 0 ? (Math.sqrt(validScores.reduce((a,b)=>a+Math.pow(b-meanScore,2),0) / validScores.length) || 1) : 1;
      
      scannedData.forEach(d => {
         d.crossZScore = d.symbol === 'CCI' ? 0 : parseFloat(((d.score - meanScore) / stdDevScore).toFixed(2));
      });

      let finalResults = scannedData;
      if (tradeDirection === 'neutral') {
          finalResults = scannedData.filter(d => d.symbol === 'CCI' || (d.score >= 75 && parseFloat(d.metrics.beta) < 0.4));
      }

      finalResults.sort((a, b) => {
        if (a.symbol === 'CCI') return -1;
        if (b.symbol === 'CCI') return 1;
        if (a.symbol === 'BTCUSDT') return -1;
        if (b.symbol === 'BTCUSDT') return 1;
        return b.score - a.score;
      });
      setResults(finalResults);
      setChartDataCache(prev => ({...prev, ...newChartCache}));
      setIsScanning(false);
    }
  };

  const runRadarScan = async () => {
    if (isRadarScanning) return;
    isRadarOpenRef.current = true;
    setIsRadarOpen(true);
    setIsRadarScanning(true);
    setRadarResults([]);
    setRadarProgress(0);
    setRadarStatus('初始化多锚点雷达矩阵，同步全球大盘环境...');

    try {
      const benchmarkSymbols = { crypto: 'BTCUSDT', equity: 'NDX', commodity: 'GOLD', forex: 'EURUSD' };
      const envs = {};
      const intKlines = {};

      await Promise.all(Object.entries(benchmarkSymbols).map(async ([cat, sym]) => {
        const k1d = await fetchBenchmark(sym, '1d', 150);
        const kInt = await fetchBenchmark(sym, klineInterval, 200);
        if (k1d && k1d.length >= 145) {
          envs[cat] = evaluateMarketRegime(k1d, sym.replace('USDT', ''));
        } else {
          envs[cat] = { trend: '未知', penalty: 0, color: 'text-gray-400', regimeType: 'neutral' };
        }
        intKlines[cat] = kInt;
      }));

      setRadarStatus('拉取全网 24h 资金流动性榜单...');
      const tickRes = await safeFetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!tickRes || !tickRes.ok) throw new Error('Ticker failed');
      const tickers = await tickRes.json();
      const usdtTickers = tickers
        .filter(t => t.symbol.endsWith('USDT') && t.symbol !== 'BTCUSDT')
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));

      const ranks = {};
      usdtTickers.forEach((t, i) => ranks[t.symbol] = i + 1);
      setCoinRanks(ranks);

      const topCoins = usdtTickers.slice(0, 200).map(t => t.symbol);
      const goldenCoins = [];
      const evalDirection = tradeDirection === 'neutral' ? 'long' : tradeDirection;

      for (let i = 0; i < topCoins.length; i++) {
        if (!isRadarOpenRef.current) break; 

        const symbol = topCoins[i];
        setRadarStatus(`[${i + 1}/200] 侦测: ${symbol} ...`);
        setRadarProgress(((i + 1) / 200) * 100);

        try {
          const klRes = await safeFetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${klineInterval}&limit=200`);
          if (!klRes || !klRes.ok) continue;
          const klines = await klRes.json();
          if (klines.length < 144) continue;

          const closes = klines.map(k => parseFloat(k[4]));
          const price = closes[closes.length - 1];
          const alma144 = calculateALMA(closes, 144).pop(); 
          const ema50 = calculateEMA(closes, 50).pop();

          if (price < alma144 && price < ema50) continue; 

          const [k15mRes, depthRes, fapiRes, oiRes] = await Promise.all([
            safeFetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=50`),
            safeFetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`),
            safeFetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`).catch(() => null),
            safeFetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`).catch(() => null)
          ]);

          const k15m = (k15mRes && k15mRes.ok) ? await k15mRes.json() : null;
          const depth = (depthRes && depthRes.ok) ? await depthRes.json() : null;
          let fr = 0.0001, oi = 0;
          if (fapiRes && fapiRes.ok) fr = parseFloat((await fapiRes.json()).lastFundingRate || 0);
          if (oiRes && oiRes.ok) oi = parseFloat((await oiRes.json()).openInterest || 0);
          
          const category = getAssetCategory(symbol);
          const isBenchmark = Object.values(benchmarkSymbols).includes(symbol) || symbol === 'BTCUSDT';
          const bmkKlines = intKlines[category] || intKlines['crypto'];
          const bmkEnv = envs[category] || envs['crypto'];

          const analysis = analyzeKlines(symbol, klines, bmkKlines, k15m, depth, fr, oi, bmkEnv, klineInterval, evalDirection, category, isBenchmark);

          if (analysis && analysis.score >= 65) {
            analysis.actualSymbol = symbol; 
            goldenCoins.push(analysis);
            setRadarResults([...goldenCoins].sort((a, b) => b.score - a.score));
          }
        } catch (err) {}
        await new Promise(res => setTimeout(res, 300)); 
      }

      if (goldenCoins.length > 0) {
        const validScores = goldenCoins.map(d => d.score);
        const meanScore = validScores.reduce((a,b)=>a+b,0) / validScores.length;
        const stdDevScore = Math.sqrt(validScores.reduce((a,b)=>a+Math.pow(b-meanScore,2),0) / validScores.length) || 1;
        goldenCoins.forEach(d => d.crossZScore = parseFloat(((d.score - meanScore) / stdDevScore).toFixed(2)));
        setRadarResults([...goldenCoins].sort((a, b) => b.score - a.score));
      }

      setRadarStatus(isRadarOpenRef.current ? `雷达扫描完成！捕获 ${goldenCoins.length} 个高潜标的。` : '雷达扫描已中止。');
    } catch (err) {
      setRadarStatus('网络节点连接异常，或触发币安限流。');
    } finally {
      setIsRadarScanning(false);
    }
  };

  const closeRadar = () => {
    isRadarOpenRef.current = false;
    setIsRadarOpen(false);
  };

  const addCoinToRoster = (symbol) => {
    if (symbol === 'BTCUSDT' || symbol === 'CCI') return;
    if (!coins.includes(symbol)) handleUpdateCoins([symbol, ...coins]);
  };

  const generateMacroPoster = async (coinData, aiContent = null) => {
    if (!coinData) return;
    setIsGeneratingMacro(true);
    setMacroPosterData({ data: coinData, aiContent });
    try {
      await new Promise(r => setTimeout(r, 200));
      const targetDom = document.getElementById('macro-poster-canvas');
      if (targetDom) {
        const canvas = await html2canvas(targetDom, { scale: 2, backgroundColor: '#030712', useCORS: true, logging: false });
        setPosterDataUrl(canvas.toDataURL('image/jpeg', 0.95));
      }
    } catch (e) {} finally { setIsGeneratingMacro(false); }
  };

  const generateMicroPoster = async (coinData) => {
    if (!coinData) return;
    setIsGeneratingMicro(true);
    setMicroPosterData(coinData);
    try {
      await new Promise(r => setTimeout(r, 200));
      const targetDom = document.getElementById('micro-poster-canvas');
      if (targetDom) {
        const canvas = await html2canvas(targetDom, { scale: 2.5, backgroundColor: 'transparent', useCORS: true, logging: false });
        setPosterDataUrl(canvas.toDataURL('image/jpeg', 0.95));
      }
    } catch (e) {} finally { setIsGeneratingMicro(false); setMicroPosterData(null); }
  };

  const extractTLDR = (text) => {
    if (!text) return "";
    const match = text.match(/### 5\..*?\n([\s\S]*)/);
    if (match && match[1]) return match[1].replace(/[*#-]/g, '').trim();
    return text.split('\n').filter(l => l.trim() !== '').pop().replace(/[*#-]/g, '').trim();
  };

  const AI_PROVIDERS = {
    gemini:   { label: 'Gemini',   color: 'indigo', model: 'gemini-2.5-flash' },
    chatgpt:  { label: 'ChatGPT',  color: 'green',  model: 'gpt-4o' },
    claude:   { label: 'Claude',   color: 'orange', model: 'claude-opus-4-5' },
    deepseek: { label: 'DeepSeek', color: 'cyan',   model: 'deepseek-v4-pro' },
  };

  const getCurrentApiKey = () => {
    if (selectedAiProvider === 'gemini')   return geminiApiKey;
    if (selectedAiProvider === 'chatgpt')  return openaiApiKey;
    if (selectedAiProvider === 'claude')   return claudeApiKey;
    if (selectedAiProvider === 'deepseek') return deepseekApiKey;
    return '';
  };

  const saveCurrentApiKey = (key) => {
    if (selectedAiProvider === 'gemini')   { setGeminiApiKey(key);   localStorage.setItem('star_gemini_api_key', key); }
    if (selectedAiProvider === 'chatgpt')  { setOpenaiApiKey(key);   localStorage.setItem('star_openai_api_key', key); }
    if (selectedAiProvider === 'claude')   { setClaudeApiKey(key);   localStorage.setItem('star_claude_api_key', key); }
    if (selectedAiProvider === 'deepseek') { setDeepseekApiKey(key); localStorage.setItem('star_deepseek_api_key', key); }
  };

  const generateAIReport = async (coinData) => {
    const currentKey = getCurrentApiKey();
    if (!currentKey) { setAiReportContent(`⚠️ 请先配置 ${AI_PROVIDERS[selectedAiProvider].label} API Key。`); return; }
    setIsGeneratingReport(true);
    setAiReportContent(null);
    setAiReasoningContent(null);
    setShowReasoning(false);

    const systemPrompt = `你是一个全球顶级的加密货币量化交易员和数据分析师，风格毒辣、精准、绝对客观、排除主观情绪。请根据提供的实时量化快照数据，输出一份【星辰 AI 深度推演报告】... (见文档)`;
    const userData = JSON.stringify({
      symbol: coinData.actualSymbol, currentPrice: coinData.currentPrice, score: coinData.score,
      marketEnv: marketEnv ? marketEnv.trend : '未知', metrics: coinData.metrics, plan: coinData.plan,
      mcResults: coinData.mcResults, buyWall: coinData.buyWall, signals: coinData.signals.map(s => s.text)
    });
    const userMessage = `请分析：\n${userData}`;

    const withRetry = async (fn, retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try { return await fn(); }
        catch (err) {
          if (i === retries - 1) throw err;
          await new Promise(r => setTimeout(r, delay)); delay *= 2;
        }
      }
    };

    const callGemini = () => withRetry(async () => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: userMessage }] }], systemInstruction: { parts: [{ text: systemPrompt }] } }) }
      );
      if (!res.ok) throw new Error(`Gemini API Error ${res.status}`);
      const data = await res.json();
      return { content: data.candidates?.[0]?.content?.parts?.[0]?.text || '暂无结论。' };
    });

    const callOpenAI = () => withRetry(async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentKey}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }] })
      });
      if (!res.ok) throw new Error(`OpenAI API Error ${res.status}`);
      const data = await res.json();
      return { content: data.choices?.[0]?.message?.content || '暂无结论。' };
    });

    const callClaude = () => withRetry(async () => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': currentKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 4096, system: systemPrompt, messages: [{ role: 'user', content: userMessage }] })
      });
      if (!res.ok) throw new Error(`Claude API Error ${res.status}`);
      const data = await res.json();
      return { content: data.content?.[0]?.text || '暂无结论。' };
    });

    const callDeepSeek = () => withRetry(async () => {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentKey}` },
        body: JSON.stringify({
          model: 'deepseek-v4-pro',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
          reasoning_effort: 'high',
          thinking: { type: 'enabled' },
          stream: false,
        })
      });
      if (!res.ok) throw new Error(`DeepSeek API Error ${res.status}`);
      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      return {
        content: msg?.content || '暂无结论。',
        reasoning: msg?.thinking || msg?.reasoning_content || null,
      };
    });

    try {
      const dispatchMap = { gemini: callGemini, chatgpt: callOpenAI, claude: callClaude, deepseek: callDeepSeek };
      const result = await dispatchMap[selectedAiProvider]();
      setAiReportContent(result.content);
      if (result.reasoning) setAiReasoningContent(result.reasoning);
    } catch (err) {
      setAiReportContent("⚠️ 星际网络受阻，请稍后再试。");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) return <h3 key={idx} className="text-sm font-bold text-cyan-400 mt-4 mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/>{line.replace('### ', '')}</h3>;
      if (line.startsWith('## ')) return <h2 key={idx} className="text-base font-bold text-indigo-400 mt-4 mb-2">{line.replace('## ', '')}</h2>;
      if (line.startsWith('# ')) return <h1 key={idx} className="text-lg font-bold text-cyan-400 mt-4 mb-2">{line.replace('# ', '')}</h1>;
      
      let formattedLine = line;
      const isListItem = formattedLine.trim().startsWith('* ') || formattedLine.trim().startsWith('- ');
      if (isListItem) formattedLine = formattedLine.trim().substring(2);

      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = []; let lastIndex = 0; let match;
      while ((match = boldRegex.exec(formattedLine)) !== null) {
          parts.push(formattedLine.substring(lastIndex, match.index));
          parts.push(<strong key={match.index} className="text-indigo-300 font-bold drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
      }
      parts.push(formattedLine.substring(lastIndex));
      if (formattedLine.trim() === '') return <div key={idx} className="h-1"></div>;
      return (
          <div key={idx} className={`mb-1.5 text-xs md:text-sm text-gray-300 leading-relaxed ${isListItem ? 'pl-4 relative' : ''}`}>
              {isListItem && <span className="absolute left-0 text-cyan-600 font-bold">•</span>}
              {parts}
          </div>
      );
    });
  };

  useEffect(() => {
    scanMarketRef.current = scanMarket;
  }, [scanMarket]);

  useEffect(() => {
    setResults([]); 
    scanMarketRef.current(true); 
    const scanFreq = klineInterval === '1h' ? 300000 : klineInterval === '4h' ? 900000 : 3600000;
    const intervalTimer = setInterval(() => { scanMarketRef.current(false); }, scanFreq);
    return () => clearInterval(intervalTimer);
  }, [klineInterval, coins.length, tradeDirection]); 

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[星辰雷达] 侦测到标签页唤醒，强制重启监控阵列与数据流...');
        scanMarketRef.current(true); 
        setWakeUpTrigger(prev => prev + 1); 
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // 💓 植入独立脉冲起搏器 (1秒心跳)：强制击碎“数据连线中”停搏幻觉
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setRadarPulse(p => p + 1);
    }, 1000);
    return () => clearInterval(pulseInterval);
  }, []);

  // V21 订单流内存池衰减机制重构：变为基于时间轴的历史快照
  useEffect(() => {
    const historyInterval = setInterval(() => {
        Object.keys(tickBufferRef.current).forEach(k => {
            const flow = tickBufferRef.current[k];
            if (!flow.history) flow.history = [];
            flow.history.push({ w: flow.whaleCVD, r: flow.retailCVD });
            if (flow.history.length > 5) flow.history.shift(); // 仅保留最近 5 分钟快照用于微观雷达比对
        });
    }, 60000);
    return () => clearInterval(historyInterval);
  }, []);

  // 🚀 双核订单流引擎：Binance Payload + Hyperliquid L2 Trades
  useEffect(() => {
    let ws;
    let aggWs;
    let hlWs;
    let reconnectTimer;
    let aggReconnectTimer;
    let hlReconnectTimer;
    let isMounted = true;

    const updateTickBuffer = (sym, tradeValue, isTakerSell) => {
        if (!tickBufferRef.current[sym]) {
            tickBufferRef.current[sym] = { retailCVD: 0, whaleCVD: 0, lastActivity: Date.now(), history: [] };
        }
        const flow = tickBufferRef.current[sym];
        const directionMultiplier = isTakerSell ? -1 : 1;
        
        if (tradeValue < 10000) {
            flow.retailCVD += (tradeValue * directionMultiplier); 
        } else if (tradeValue > 50000) {
            flow.whaleCVD += (tradeValue * directionMultiplier); 
        }
        flow.lastActivity = Date.now();
    };

    const connectWS = () => {
      if (isLiveMode && results.length > 0) {
        try {
          // 1. 币安宏观心跳流 (miniTicker)
          ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const priceMap = {};
            data.forEach(tick => { 
              if (coins.includes(tick.s)) {
                priceMap[tick.s] = parseFloat(tick.c);
              }
            });
            if (Object.keys(priceMap).length > 0) setLivePrices(prev => ({ ...prev, ...priceMap }));
          };
          ws.onerror = () => console.warn('[星辰哨兵] 宏观行情心跳阻断...');
          ws.onclose = () => {
            if (isMounted && isLiveMode) { clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connectWS, 3000); }
          };

          // 2. 币安底层订单流 (动态 Payload 模式防溢出断连)
          const binanceCoins = coins.filter(c => !c.startsWith('HL:') && c !== 'CCI');
          if (binanceCoins.length > 0) {
             aggWs = new WebSocket('wss://stream.binance.com:9443/ws');
             aggWs.onopen = () => {
                const params = binanceCoins.map(c => `${c.toLowerCase()}@aggTrade`);
                aggWs.send(JSON.stringify({ method: 'SUBSCRIBE', params: params, id: 1 }));
             };
             aggWs.onmessage = (event) => {
               const payload = JSON.parse(event.data);
               if (payload.e === 'aggTrade') {
                 const sym = payload.s;
                 const price = parseFloat(payload.p);
                 const qty = parseFloat(payload.q);
                 const tradeValue = price * qty;
                 updateTickBuffer(sym, tradeValue, payload.m);
               }
             };
             aggWs.onclose = () => {
               if (isMounted && isLiveMode) { clearTimeout(aggReconnectTimer); aggReconnectTimer = setTimeout(connectWS, 3000); }
             };
          }

          // 3. 链上 Smart Money 雷达：Hyperliquid L2 订单流直连
          const hlCoins = coins.filter(c => c.startsWith('HL:'));
          if (hlCoins.length > 0) {
             hlWs = new WebSocket('wss://api.hyperliquid.xyz/ws');
             hlWs.onopen = () => {
                hlCoins.forEach(c => {
                   const rawName = c.replace('HL:', '').split('/')[0];
                   hlWs.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'trades', coin: rawName } }));
                });
             };
             hlWs.onmessage = (event) => {
                const payload = JSON.parse(event.data);
                if (payload.channel === 'trades' && payload.data) {
                   const priceMap = {};
                   payload.data.forEach(trade => {
                      const matchedSymbol = hlCoins.find(c => c.includes(trade.coin));
                      if (!matchedSymbol) return;
                      
                      const price = parseFloat(trade.px);
                      const qty = parseFloat(trade.sz);
                      const tradeValue = price * qty;
                      // HL 撮合机制: 'B'(Bid/买单被击穿) 代表吃单者(Taker)是在做空卖出
                      const isTakerSell = trade.side === 'B'; 
                      
                      updateTickBuffer(matchedSymbol, tradeValue, isTakerSell);
                      priceMap[matchedSymbol] = price; // 同步解决 HL 资产界面无心跳价格更新问题
                   });
                   if (Object.keys(priceMap).length > 0) setLivePrices(prev => ({ ...prev, ...priceMap }));
                }
             };
             hlWs.onclose = () => {
               if (isMounted && isLiveMode) { clearTimeout(hlReconnectTimer); hlReconnectTimer = setTimeout(connectWS, 3000); }
             };
          }

        } catch (err) {}
      }
    };

    connectWS();

    return () => { 
      isMounted = false;
      clearTimeout(reconnectTimer); clearTimeout(aggReconnectTimer); clearTimeout(hlReconnectTimer);
      try { if (ws && ws.readyState !== 3) ws.close(); } catch(e){} 
      try { if (aggWs && aggWs.readyState !== 3) aggWs.close(); } catch(e){} 
      try { if (hlWs && hlWs.readyState !== 3) hlWs.close(); } catch(e){} 
    };
  }, [isLiveMode, coins, results.length, wakeUpTrigger]);

  const TVChart = ({ data, coinInfo, showHeatmap }) => {
    const chartContainerRef = useRef();
    useEffect(() => {
      if (!chartContainerRef.current || !data) return;
      let chart; let resizeHandler;
      chartContainerRef.current.innerHTML = '';
      chart = createChart(chartContainerRef.current, {
        layout: { background: { type: 'solid', color: '#131722' }, textColor: '#d1d4dc' },
        grid: { vertLines: { color: 'rgba(42, 46, 57, 0.5)' }, horzLines: { color: 'rgba(42, 46, 57, 0.5)' } },
        rightPriceScale: { borderColor: 'rgba(197, 203, 206, 0.8)' },
        timeScale: { borderColor: 'rgba(197, 203, 206, 0.8)', timeVisible: true },
        crosshair: { mode: CrosshairMode.Normal },
      });

      const candlestickSeries = chart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' });
      candlestickSeries.setData(data);

      if (coinInfo && coinInfo.tdData) {
         const markers = [];
         coinInfo.tdData.forEach((td, i) => {
            if (td.tdCount >= 6 && data[i]) {
               markers.push({
                  time: data[i].time,
                  position: td.tdType === 'buy' ? 'belowBar' : 'aboveBar',
                  color: td.tdType === 'buy' ? '#10B981' : '#EF4444',
                  shape: td.tdType === 'buy' ? 'arrowUp' : 'arrowDown',
                  text: td.tdCount.toString() + (td.tdCount === 9 && td.isBlocked ? ' 🛑' : '')
               });
            }
         });
         candlestickSeries.setMarkers(markers);
      }

      if (showHeatmap && coinInfo && coinInfo.liqClusters) {
         coinInfo.liqClusters.forEach(cluster => {
            candlestickSeries.createPriceLine({
               price: cluster.price, color: 'rgba(234, 179, 8, 0.5)', lineWidth: 2, lineStyle: LineStyle.Dashed,
               axisLabelVisible: true, title: '🔥 50x/100x 爆仓池'
            });
         });
      }

      if (coinInfo && coinInfo.plan) {
        candlestickSeries.createPriceLine({ price: coinInfo.plan.entryPoint, color: '#06b6d4', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '计划入场' });
        candlestickSeries.createPriceLine({ price: coinInfo.plan.stopLoss, color: '#ef4444', lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: '严格止损' });
        candlestickSeries.createPriceLine({ price: coinInfo.plan.target, color: '#fbbf24', lineWidth: 1, lineStyle: LineStyle.SparseDotted, axisLabelVisible: true, title: '目标' });
        if (coinInfo.plan.smcOB) {
          candlestickSeries.createPriceLine({ price: coinInfo.plan.smcOB.top, color: 'rgba(244, 63, 94, 0.7)', lineWidth: 1, lineStyle: LineStyle.SparseDotted, axisLabelVisible: false, title: 'OB Sweep' });
          candlestickSeries.createPriceLine({ price: coinInfo.plan.smcOB.bottom, color: 'rgba(244, 63, 94, 0.7)', lineWidth: 1, lineStyle: LineStyle.SparseDotted, axisLabelVisible: false, title: 'OB Sweep' });
        }
      }
      chart.timeScale().fitContent();
      resizeHandler = () => { if (chartContainerRef.current && chart) chart.applyOptions({ width: chartContainerRef.current.clientWidth }); };
      window.addEventListener('resize', resizeHandler);

      return () => { if (resizeHandler) window.removeEventListener('resize', resizeHandler); if (chart) chart.remove(); };
    }, [data, coinInfo, showHeatmap]);
    return <div ref={chartContainerRef} className="w-full h-full" />;
  };

  const calculatePosition = (entry, stopLoss, totalCap, riskPct) => {
    const riskAmount = totalCap * (riskPct / 100);
    const perCoinRisk = Math.abs(entry - stopLoss);
    if (perCoinRisk <= 0) return { coins: 0, value: 0, riskAmount: 0 };
    const coinsToBuy = riskAmount / perCoinRisk;
    return { coins: coinsToBuy.toFixed(4), value: (coinsToBuy * entry).toFixed(2), riskAmount: riskAmount.toFixed(2) };
  };

  const getZhName = (actualSymbol) => {
    if (!actualSymbol) return '';
    const pure = actualSymbol.replace('HL:', '').replace(/\/USDC|USDT|USDC/gi, '').split(':').pop();
    return ZH_NAMES[pure.toUpperCase()] || '';
  };

  const handleSearchChange = (e) => {
    const val = e.target.value; setNewCoin(val);
    if (!val.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    const q = val.toUpperCase().replace('HL:', '');
    const matches = globalAssetList.filter(a => a.name.toUpperCase().includes(q) || a.id.toUpperCase().includes(q) || (a.zhName && a.zhName.includes(val))).slice(0, 8);
    setSearchResults(matches); setShowDropdown(true);
  };

  const handleSelectAsset = (asset) => {
    if (!coins.includes(asset.id)) handleUpdateCoins([asset.id, ...coins]);
    setNewCoin(''); setShowDropdown(false); setIsMobileSearchOpen(false);
  };

  const handleAddCoin = (e) => {
    e.preventDefault();
    if (showDropdown && searchResults.length > 0) { handleSelectAsset(searchResults[0]); return; }
    const rawInput = newCoin.trim(); const upperInput = rawInput.toUpperCase();
    if (!rawInput || upperInput === 'BTC' || upperInput === 'BTCUSDT' || upperInput === 'CCI') { setNewCoin(''); return; }
    let finalSymbol = upperInput.startsWith('HL:') ? 'HL:' + rawInput.substring(3) : upperInput;
    if (!finalSymbol.endsWith('USDT') && !finalSymbol.endsWith('USDC') && !finalSymbol.startsWith('HL:')) finalSymbol = `${finalSymbol}USDT`; 
    if (!coins.includes(finalSymbol)) handleUpdateCoins([finalSymbol, ...coins]);
    setNewCoin(''); setShowDropdown(false);
  };

  const removeCoin = (symbolToRemove) => {
    if (symbolToRemove === 'BTCUSDT' || symbolToRemove === 'CCI') return;
    handleUpdateCoins(coins.filter(c => c !== symbolToRemove));
  };

  const handleDirectionClick = (newDir) => {
    if (newDir === tradeDirection) return;
    if (marketEnv && hasAutoSetDirectionRef.current) {
      const regime = marketEnv.regimeType; 
      let isConflict = false;
      let msg = '';
      let recommendedDir = '';
      
      if (regime === 'neutral' && newDir !== 'neutral') {
          isConflict = true;
          msg = `当前大盘处于 [${marketEnv.trend}] 的混沌周期，强行开启 [${newDir === 'long' ? '做多' : '做空'}] 极易被双向插针打损`;
          recommendedDir = 'neutral';
      } else if (regime === 'bear' && newDir === 'long') {
          isConflict = true;
          msg = `当前大盘处于 [${marketEnv.trend}]，逆势开启 [做多] 等于空手接飞刀`;
          recommendedDir = 'short';
      } else if (regime === 'bull' && newDir === 'short') {
          isConflict = true;
          msg = `当前大盘处于 [${marketEnv.trend}]，狂牛中逆势开启 [做空] 极易被单边轧空拉爆`;
          recommendedDir = 'long';
      }
      
      if (isConflict) {
        setConflictData({ msg, targetDir: newDir, recommendedDir });
        setShowConflictWarning(true); 
        return; 
      }
    }
    setTradeDirection(newDir);
  };

  const renderRRRWithTooltip = (res) => {
    const rd = res.rrrDetails;
    if (!rd) return <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${res.plan.rrr >= 2.5 ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>盈亏比 {res.plan.rrr}</span>;
    return (
      <div className="relative inline-flex items-center cursor-help" 
           onMouseEnter={(e) => handleMouseEnterTooltip('rrr', res, e)} 
           onMouseLeave={handleMouseLeaveTooltip}>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border-b border-dashed border-current transition-colors ${res.plan.rrr >= 2.5 ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
          盈亏比 {res.plan.rrr}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 font-sans selection:bg-cyan-900 relative">
      <style>{`
        @keyframes danmaku-fly { from { left: 100vw; transform: translateX(0); } to { left: 0; transform: translateX(-100%); } }
        .animate-danmaku { animation: danmaku-fly 8s linear forwards; }
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-ticker { animation: ticker-scroll 120s linear infinite; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
        ::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.5); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.8); }
      `}</style>

      {/* --- 🌟 浮动关于侧边栏 --- */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[400] flex items-center group">
         <div className="bg-gray-800/80 backdrop-blur border border-r-0 border-gray-700 p-2 rounded-l-xl text-gray-500 group-hover:text-cyan-400 transition-colors shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer">
            <Info className="w-5 h-5 animate-pulse group-hover:animate-none" />
         </div>
         <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 translate-x-4 group-hover:translate-x-0">
            <div className="bg-gray-950/95 backdrop-blur-xl border border-cyan-500/40 p-4 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col gap-3 min-w-[200px]">
               <div className="text-sm font-bold text-gray-200 flex items-center gap-2 border-b border-gray-800 pb-2 mb-1"><Info className="w-4 h-4 text-cyan-400"/> 工具信息</div>
               <a href="https://v.douyin.com/xnQQRr52FoU/" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg border border-gray-800 hover:border-cyan-500/30">
                  <span className="text-base">🎵</span> 抖音原创工具
               </a>
               <div className="text-xs text-gray-400 flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg border border-gray-800">
                  <span className="text-base">💬</span> QQ群: <span className="font-mono text-indigo-400 font-bold tracking-widest ml-1">9123155</span>
               </div>
            </div>
         </div>
      </div>

      {/* 弹幕浮层区 */}
      <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
        {danmakus.map(d => (
          <div key={d.id} className="absolute whitespace-nowrap text-lg md:text-xl font-black drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)] animate-danmaku flex items-center gap-2" style={{ top: `${d.top}%`, color: d.color, textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
            <span className="text-[0.55em] opacity-80 border border-current rounded px-1.5 py-0.5 tracking-widest">{d.region}</span>{d.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSendDanmaku} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-gray-900/90 backdrop-blur-md border border-gray-700 p-1.5 px-2 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all hover:border-indigo-500/50">
        <button type="button" onClick={() => setIsAlertPanelOpen(true)} className="relative px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white bg-gray-800 border border-gray-700 hover:border-yellow-500/50 hover:bg-yellow-600/30 rounded-full transition-all">
          <BellRing className={`w-4 h-4 ${isSentinelRunning ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`} />
          <span className="hidden sm:inline">情报局</span>
          {alerts.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-gray-900"></span>}
        </button>
        <button type="button" onClick={() => setIsHistoryOpen(true)} className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white bg-gray-800 border border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-600/30 rounded-full transition-all">
          <MessageSquare className="w-4 h-4 text-indigo-400" /><span className="hidden sm:inline">大厅</span>
        </button>
        <input type="text" placeholder={ABLY_API_KEY ? "发送全网实时弹幕..." : "(本地) 填 Ably Key"} value={danmakuInput} onChange={(e) => setDanmakuInput(e.target.value)} maxLength={40} className="bg-transparent text-xs sm:text-sm text-gray-200 px-1 sm:px-2 py-1.5 w-32 sm:w-48 md:w-64 focus:outline-none placeholder-gray-500" />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"><Send className="w-4 h-4" />Biu</button>
      </form>

      {/* 🚨 侧边异动情报局面板 (Sentinel Alert Drawer) */}
      {isAlertPanelOpen && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-gray-950/95 backdrop-blur-2xl border-l border-gray-800 z-[260] flex flex-col shadow-2xl transform transition-transform animate-in slide-in-from-right duration-300">
          <div className="p-4 pt-16 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
            <div>
              <h3 className="font-bold flex items-center gap-2 text-white"><AlertTriangle className="w-5 h-5 text-yellow-400" /> 24h 异动情报局</h3>
              <p className="text-[10px] text-gray-500 mt-1">静默巡航哨兵自动捕捉的极端建仓/逃顶标的</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowOnlyStar(!showOnlyStar)} title="只看多周期共振星标" className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center ${showOnlyStar ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'}`}>
                <Sparkles className="w-4 h-4" />
              </button>
              <button onClick={() => setIsAlertPanelOpen(false)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 text-sm space-y-4">
                <Bell className="w-12 h-12 opacity-20" />
                <p>{isSentinelRunning ? '哨兵巡航中，暂未发现极端异动。' : '哨兵已休眠，请开启静默巡航功能。'}</p>
              </div>
            ) : alerts.filter(a => showOnlyStar ? a.isStar : true).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 text-sm space-y-4">
                <Sparkles className="w-12 h-12 opacity-20" />
                <p>当前暂无完美共振的星标信号。</p>
              </div>
            ) : (
              alerts.filter(a => showOnlyStar ? a.isStar : true).map((alert) => (
                <div key={alert.id} className={`text-sm bg-gray-900/50 p-3 rounded-xl border transition-colors cursor-pointer ${alert.isStar ? 'border-yellow-500/30 hover:border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-gray-800 hover:border-gray-700'}`} onClick={() => { addCoinToRoster(alert.symbol); setIsAlertPanelOpen(false); }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-gray-500">{new Date(alert.timestamp).toLocaleTimeString('zh-CN')}</span>
                    <div className="flex items-center gap-1.5">
                      {alert.isStar && <span className="text-[9px] px-1.5 py-0.5 rounded border border-yellow-500/50 text-yellow-400 bg-yellow-900/30 animate-pulse flex items-center gap-1"><Sparkles className="w-2.5 h-2.5"/> 完美共振</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${alert.type === 'long' ? 'border-green-500/30 text-green-400 bg-green-900/20' : 'border-red-500/30 text-red-400 bg-red-900/20'}`}>
                        {alert.type === 'long' ? '💎 建仓' : '🚨 逃顶'}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-white mb-2">{alert.title}</div>
                  
                  {alert.tags && alert.tags.length > 0 && (
                     <div className="flex flex-wrap gap-1.5 mb-2.5">
                       {alert.tags.map((tag, tIdx) => {
                          let colorCls = 'bg-indigo-900/30 border-indigo-500/30 text-indigo-300';
                          if (tag.includes('1H')) colorCls = 'bg-cyan-900/30 border-cyan-500/30 text-cyan-300';
                          if (tag.includes('1D')) colorCls = 'bg-orange-900/30 border-orange-500/30 text-orange-300';
                          if (tag.includes('b型') || tag.includes('铁底')) colorCls = 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400 font-bold';
                          if (tag.includes('P型') || tag.includes('铁顶')) colorCls = 'bg-rose-900/30 border-rose-500/30 text-rose-400 font-bold';
                          if (tag.includes('D型')) colorCls = 'bg-indigo-900/30 border-indigo-500/30 text-indigo-400';
                          if (tag.includes('无')) colorCls = 'bg-gray-800 border-gray-700 text-gray-500';
                          
                          // 🚨 逆风警报动态变色逻辑 (Headwind Conflict Color Override)
                          if (alert.type === 'long' && tag.includes('P型')) {
                              colorCls = 'bg-red-950 border-red-600 text-red-400 font-black animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]';
                          } else if (alert.type === 'short' && tag.includes('b型')) {
                              colorCls = 'bg-red-950 border-red-600 text-red-400 font-black animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]';
                          }

                          return <span key={tIdx} className={`text-[9px] px-1.5 py-0.5 rounded border ${colorCls}`}>{tag}</span>;
                       })}
                     </div>
                  )}

                  <div className="text-gray-400 text-[11px] leading-relaxed mb-3">{alert.desc.replace(/\[.*?\]/g, '').trim()}</div>
                  
                  <div className="flex justify-between items-center text-[10px] border-t border-gray-800/50 pt-2">
                    <span className="font-mono text-gray-500">现价: ${alert.price.toPrecision(5)}</span>
                    <span className="text-gray-500">V12 得分: <strong className={alert.score >= 70 ? 'text-cyan-400' : 'text-indigo-400'}>{alert.score}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 mt-1.5">
        
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-800 pb-3">
          {/* 左侧：Logo 与多空阵列 */}
          <div className="flex items-center gap-2 shrink-0">
            <h1 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
                <div className="relative bg-gray-950 p-1 md:p-1.5 rounded-full border border-cyan-500/30">
                  <Bitcoin className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                </div>
              </div>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">星辰妙漫炒币器</span>
            </h1>
            
            <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 ml-1 md:ml-2 shadow-inner">
              <button onClick={() => handleDirectionClick('long')} className={`px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold transition-all ${tradeDirection === 'long' ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'text-gray-500 hover:text-gray-300'}`}>📈 做多</button>
              <button onClick={() => handleDirectionClick('neutral')} className={`px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold transition-all ${tradeDirection === 'neutral' ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'text-gray-500 hover:text-gray-300'}`}>🛡️ 观望</button>
              <button onClick={() => handleDirectionClick('short')} className={`px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold transition-all ${tradeDirection === 'short' ? 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-gray-500 hover:text-gray-300'}`}>📉 做空</button>
            </div>
            {marketEnv && (
              <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] md:text-[10px] font-bold border ${marketEnv.color} border-current/30 bg-current/10 hidden xl:flex`}>
                <Globe className="w-3 h-3" />{marketEnv.trend}
              </span>
            )}
          </div>

          {/* 中间：内嵌式极简走马灯 (Ticker Tape) - 零空间侵占 */}
          <div className="flex-1 w-full lg:w-auto relative bg-gray-900/40 rounded-lg border border-gray-800/50 overflow-hidden flex items-center h-8 lg:mx-3 shadow-inner">
             <div className="absolute left-0 z-20 flex items-center h-full px-2.5 bg-gray-950/95 border-r border-gray-800/50 backdrop-blur-md">
               <BellRing className={`w-3.5 h-3.5 ${isSentinelRunning ? 'text-yellow-400 animate-pulse' : 'text-gray-600'}`} />
             </div>
             <div className="absolute left-[34px] z-10 w-8 h-full bg-gradient-to-r from-gray-950/95 to-transparent pointer-events-none"></div>

             <div className="flex-1 overflow-hidden relative flex items-center h-full ml-[34px]">
               {alerts.length === 0 ? (
                  <div className="text-[10px] text-gray-600 font-mono px-3 flex items-center gap-1.5 animate-pulse">
                    <Activity className="w-3 h-3 opacity-50"/> {isSentinelRunning ? '潜行侦测异动中...' : '哨兵休眠'}
                  </div>
               ) : (
                  <div className="flex w-max animate-ticker hover:[animation-play-state:paused] items-center">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="flex shrink-0 items-center h-full min-w-[300px] md:min-w-[400px] pr-12 md:pr-24">
                        {alerts.map((alert, idx) => (
                          <div key={`${alert.id}-${i}-${idx}`} onClick={() => addCoinToRoster(alert.symbol)} className={`flex items-center gap-1.5 px-3 h-full border-r border-gray-800/30 last:border-0 cursor-pointer transition-all group ${alert.type === 'long' ? 'hover:bg-cyan-900/20' : 'hover:bg-red-900/20'}`}>
                            <span className={`text-[9px] px-1 py-0.5 rounded flex items-center ${alert.type === 'long' ? 'text-cyan-400 bg-cyan-900/30' : 'text-red-400 bg-red-900/30'}`}>
                               {alert.type === 'long' ? '💎' : '🚨'}
                            </span>
                            <span className={`text-[11px] font-black ${alert.type === 'long' ? 'text-gray-200 group-hover:text-cyan-300' : 'text-gray-200 group-hover:text-red-300'}`}>{alert.symbol.replace(/USDT|HL:/g,'')}</span>
                            <span className={`text-[10px] font-bold ${alert.score >= 75 ? 'text-cyan-400' : 'text-indigo-400'}`}>{alert.score}</span>
                          </div>
                        ))}
                        {/* 优雅的循环节点分隔符 */}
                        <div className="ml-6 md:ml-12 flex items-center gap-1 opacity-40">
                           <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                           <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                           <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                        </div>
                      </div>
                    ))}
                  </div>
               )}
             </div>
             <div className="absolute right-0 z-10 w-8 h-full bg-gradient-to-l from-gray-900/90 to-transparent pointer-events-none"></div>
          </div>

          {/* 右侧：紧凑型控制区 */}
          <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button onClick={toggleSentinel} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] md:text-xs font-bold border transition-all ${isSentinelRunning ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'}`}>
                <BellRing className={`w-3 h-3 ${isSentinelRunning ? 'animate-pulse' : ''}`} />
                <span>哨兵 {isSentinelRunning ? 'ON' : 'OFF'}</span>
              </button>
              <button onClick={() => setIsLiveMode(!isLiveMode)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] md:text-xs font-bold border transition-all ${isLiveMode ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'}`}>
                {isLiveMode ? <Radio className="w-3 h-3 animate-pulse" /> : <Radar className="w-3 h-3" />}
                <span>LIVE</span>
              </button>
            </div>
            <div className="flex items-center gap-0.5 bg-gray-900 p-0.5 rounded-lg border border-gray-800">
              {['1h', '4h', '1d'].map(t => (
                <button key={t} onClick={() => setKlineInterval(t)} className={`px-2 md:px-3 py-1 rounded-md text-[10px] md:text-xs font-medium transition-colors border ${klineInterval === t ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'border-transparent text-gray-400 hover:bg-gray-800'}`}>{t}</button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-start md:items-center" ref={searchContainerRef}>
          <div className="hidden md:flex w-full md:w-auto relative">
            <form onSubmit={handleAddCoin} className="flex w-full relative z-20">
              <input type="text" placeholder="输入代币检索全网超级索引" value={newCoin} onChange={handleSearchChange} onFocus={() => newCoin.trim() && setShowDropdown(true)} className="bg-gray-900 border border-gray-700 text-gray-100 px-4 py-2 rounded-l-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-48 transition-all focus:w-64" />
              <button type="submit" className="bg-gray-800 hover:bg-gray-700 border border-l-0 border-gray-700 px-4 py-2 rounded-r-lg transition-colors flex items-center gap-2"><Search className="w-4 h-4 text-gray-400" /></button>
            </form>
            
            {showDropdown && searchResults.length > 0 && (
               <div className="absolute top-full mt-2 w-full bg-gray-950/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl z-[200] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 fade-in duration-200">
                  {searchResults.map(res => (
                     <div key={res.id} onClick={() => handleSelectAsset(res)} className="px-4 py-3 hover:bg-gray-800 cursor-pointer flex justify-between items-center border-b border-gray-800/50 last:border-0 transition-colors group">
                        <span className="font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">
                          {res.zhName ? <span className="text-white mr-1">{res.zhName} <span className="text-gray-500 text-xs ml-1">({res.name})</span></span> : res.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded border border-gray-700 text-gray-400 bg-gray-900 shrink-0">{res.badge}</span>
                     </div>
                  ))}
               </div>
            )}
          </div>

          <div className="flex w-full md:w-auto gap-2 sm:gap-3 relative">
            {isMobileSearchOpen ? (
              <div className="flex w-full md:hidden relative animate-in slide-in-from-right-4 fade-in duration-200">
                <form onSubmit={handleAddCoin} className="flex w-full relative z-20">
                  <input type="text" placeholder="键入任意资产嗅探" value={newCoin} onChange={handleSearchChange} onFocus={() => newCoin.trim() && setShowDropdown(true)} autoFocus className="w-full bg-gray-900 border border-gray-700 text-gray-100 px-4 py-2 rounded-l-lg focus:outline-none focus:border-cyan-500" />
                  <button type="submit" className="bg-cyan-600/20 hover:bg-cyan-600/40 border-y border-gray-700 text-cyan-400 px-4 transition-colors"><Search className="w-4 h-4" /></button>
                  <button type="button" onClick={() => { setIsMobileSearchOpen(false); setShowDropdown(false); }} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 rounded-r-lg text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
                </form>
                {showDropdown && searchResults.length > 0 && (
                   <div className="absolute top-full left-0 mt-2 w-full bg-gray-950/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl z-[200] overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar">
                      {searchResults.map(res => (
                         <div key={res.id} onClick={() => handleSelectAsset(res)} className="px-4 py-3 hover:bg-gray-800 cursor-pointer flex justify-between items-center border-b border-gray-800/50 last:border-0 transition-colors">
                            <span className="font-bold text-gray-200">
                              {res.zhName ? <span className="text-white mr-1">{res.zhName} <span className="text-gray-500 text-xs ml-1">({res.name})</span></span> : res.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded border border-gray-700 text-gray-400 bg-gray-900 shrink-0">{res.badge}</span>
                         </div>
                      ))}
                   </div>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => setIsMobileSearchOpen(true)} className="md:hidden flex-none flex items-center justify-center px-3.5 rounded-lg border border-gray-700 bg-gray-900 text-cyan-400 hover:bg-gray-800 transition-colors"><Search className="w-4 h-4" /></button>
                <button onClick={runRadarScan} disabled={isRadarScanning} className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${isRadarScanning ? 'bg-indigo-900/50 text-indigo-400 cursor-not-allowed border border-indigo-500/30' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-600/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]'}`}>
                  <Rocket className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${isRadarScanning ? 'animate-bounce' : ''}`} />
                  <span className="hidden sm:inline">星际雷达 (Top 200)</span><span className="sm:hidden truncate">星际雷达</span>
                </button>
                <button onClick={scanMarket} disabled={isScanning} className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${isScanning ? 'bg-cyan-900 text-cyan-400 cursor-not-allowed' : 'bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 hover:border-cyan-500/50 text-gray-300 hover:text-cyan-400'}`}>
                  <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
                  <span className="hidden sm:inline">{isScanning ? `推演中 ${Math.round(progress)}%` : '强制扫描监控阵列'}</span><span className="sm:hidden truncate">{isScanning ? `${Math.round(progress)}%` : '扫描阵列'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {coins.map(c => (
            <span key={c} className={`group flex items-center gap-1 border px-3 py-1 rounded-full text-xs font-medium transition-colors ${c === 'BTCUSDT' ? 'bg-orange-500/10 border-orange-500/50 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600'}`}>
              {c === 'BTCUSDT' && <Bitcoin className="w-3.5 h-3.5" />}
              {c.replace('HL:', '').replace(/\/USDC|USDT|USDC/gi, '')}
              {c !== 'BTCUSDT' && coinRanks[c] > 100 && <span className="text-[9px] bg-red-900/50 text-red-400 px-1 rounded-sm border border-red-500/30">#{coinRanks[c]}</span>}
              {c !== 'BTCUSDT' && coinRanks[c] > 50 && coinRanks[c] <= 100 && <span className="text-[9px] bg-amber-900/50 text-amber-400 px-1 rounded-sm border border-amber-500/30">#{coinRanks[c]}</span>}
              {c !== 'BTCUSDT' && <button onClick={() => removeCoin(c)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity ml-1">×</button>}
            </span>
          ))}
        </div>

        {/* --- 主力战报阵列区 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {tradeDirection === 'neutral' && results.filter(r => r.symbol !== 'CCI').length === 0 ? (
            <div className="col-span-full py-24 text-center border border-indigo-500/30 rounded-2xl bg-indigo-950/10 shadow-[0_0_50px_rgba(79,70,229,0.1)] relative overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full"></div>
               <ShieldAlert className="w-16 h-16 text-indigo-400 mx-auto mb-6 relative z-10 animate-pulse" />
               <h3 className="text-2xl font-black text-white mb-2 relative z-10">空仓保护机制已激活</h3>
               <p className="text-indigo-300 text-sm max-w-lg mx-auto relative z-10 leading-relaxed">
                  当前大盘环境混沌，系统已自动熔断常规趋势扫描。<br/>
                  <span className="text-gray-400 mt-2 block">V12 引擎正在暗中为您寻觅 <strong>Beta &lt; 0.4 且得分 &ge; 75</strong> 的极度稀缺事件驱动型 Alpha...<br/>如果雷达毫无反应，说明<strong>最好的交易就是不交易。</strong></span>
               </p>
            </div>
          ) : results.length > 0 ? results.map((res, idx) => {
            const displayPrice = (isLiveMode && livePrices[res.symbol]) ? livePrices[res.symbol] : res.currentPrice;
            const liveRiskDistance = (((displayPrice - res.plan.entryPoint) / res.plan.entryPoint) * 100).toFixed(1);
            const isBTC = res.symbol === 'BTCUSDT';
            const isCCI = res.symbol === 'CCI';
            const isKillZone = Math.abs(liveRiskDistance) <= 1.5 && parseFloat(res.plan.rrr) >= 2.0 && res.score >= 60 && !res.rrrDetails.isFOMO;

            return (
            <div 
              key={res.symbol} 
              onClick={() => setSelectedCoin(res)}
              className={`relative bg-gray-900 rounded-xl border p-4 sm:p-5 transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer group ${
                isCCI ? 'border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/30' :
                isKillZone ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-pulse ring-1 ring-cyan-400/50' :
                isBTC ? 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/20' :
                res.score >= 75 ? 'border-cyan-500/60 shadow-cyan-900/30' : 
                res.score >= 55 ? 'border-indigo-500/30' : 
                res.score >= 35 ? 'border-gray-800 opacity-80 hover:opacity-100' : 
                'border-red-900/50 opacity-80 hover:opacity-100 shadow-red-900/10'
              }`}
            >
              <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
                <div className="absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-20" style={{ backgroundColor: isCCI ? '#f59e0b' : isKillZone ? '#22d3ee' : isBTC ? '#f97316' : res.score >= 75 ? '#06b6d4' : res.score >= 55 ? '#6366f1' : res.score >= 35 ? '#9ca3af' : '#ef4444' }} />
              </div>

              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center gap-1.5">
                <button onClick={(e) => { e.stopPropagation(); if (!isGeneratingMicro) generateMicroPoster(res); }} className="p-1.5 bg-gray-950/80 hover:bg-cyan-900/50 text-gray-400 hover:text-cyan-400 rounded-lg border border-transparent hover:border-cyan-500/50 transition-all group/btn relative">
                  {isGeneratingMicro && microPosterData?.symbol === res.symbol ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> : <Camera className="w-4 h-4" />}
                  <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-gray-900 text-[10px] text-gray-300 rounded border border-gray-700 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity">分享雷达快照</div>
                </button>
                <div className="p-1.5 bg-gray-950/80 text-gray-500 rounded-lg hidden sm:block"><Maximize2 className="w-4 h-4" /></div>
              </div>

              <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
                <div>
                  <h3 className={`text-lg sm:text-xl font-bold flex items-center flex-wrap gap-1.5 sm:gap-2 ${isBTC ? 'text-orange-400' : isCCI ? 'text-amber-400' : ''}`}>
                    {isBTC && <Bitcoin className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
                    {isCCI && <Globe className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
                    {getZhName(res.actualSymbol) && <span className="text-white shrink-0">{getZhName(res.actualSymbol)}</span>}
                    <span className={`shrink-0 ${getZhName(res.actualSymbol) ? 'text-gray-400 text-sm sm:text-base' : ''}`}>{res.actualSymbol.replace(/\/USDC|USDT|USDC/gi, '')}</span>
                    {!isCCI && <span className="text-[10px] sm:text-xs text-gray-500 font-normal shrink-0">/{res.isHL ? 'USDC' : 'USDT'}</span>}
                    
                    {res.isHL && <span className="bg-purple-900/50 text-purple-400 border border-purple-500/50 px-1.5 py-0.5 rounded text-[10px] shrink-0 ml-1 shadow-[0_0_10px_rgba(168,85,247,0.3)]">Hyperliquid 节点</span>}
                    {isKillZone && <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-400 px-1.5 py-0.5 rounded text-[10px] shrink-0 animate-bounce shadow-[0_0_10px_rgba(34,211,238,0.5)]">🎯 临界共振</span>}
                    {isBTC && <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] shrink-0 ml-1">大盘中枢</span>}
                    {isCCI && <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] shrink-0 ml-1 animate-pulse">全息合成指数</span>}
                    {res.crossZScore > 1.2 && !isCCI && <span className="bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50 px-1.5 py-0.5 rounded text-[10px] shrink-0 ml-1 shadow-[0_0_10px_rgba(217,70,239,0.4)] animate-pulse">🔥 极度稀缺 Alpha (Z&gt;1.2)</span>}
                  </h3>
                  <p className={`font-mono text-base sm:text-lg mt-1 flex items-center gap-2 ${isLiveMode && !isCCI ? 'text-green-400' : 'text-gray-300'}`}>
                    ${displayPrice.toPrecision(5)}
                    {isLiveMode && !isCCI && <span className="flex h-1.5 w-1.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl sm:text-4xl font-black" style={{ color: res.score >= 75 ? '#22d3ee' : res.score >= 55 ? '#818cf8' : res.score >= 35 ? '#9ca3af' : '#f87171' }}>{res.score}</div>
                  <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1 cursor-help inline-block border-b border-dashed border-gray-600 hover:text-gray-300 transition-colors"
                    onMouseEnter={(e) => handleMouseEnterTooltip('score', res, e)}
                    onMouseLeave={handleMouseLeaveTooltip}>V12 指数平滑分</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4 relative z-10">
                {!isCCI && (
                  <span className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md font-medium tracking-wide border shadow-sm ${res.metrics.profileShape === 'P型' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]' : res.metrics.profileShape === 'b型' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.2)]'}`}>
                    {res.metrics.profileShape === 'P型' ? '🧱 P型压顶' : res.metrics.profileShape === 'b型' ? '🛡️ b型兜底' : '⚖️ D型平衡'}
                  </span>
                )}
                {res.signals.length > 0 ? res.signals.map((sig, i) => (
                  <span key={i} className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md font-medium tracking-wide ${sig.color}`}>{sig.text}</span>
                )) : <span className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md bg-gray-800 text-gray-500">{res.score >= 35 ? "中性震荡中" : "弱势走势"}</span>}
              </div>

              <div className="flex items-center justify-between bg-gray-950/80 rounded border border-gray-800 p-2 mb-3 sm:mb-4 relative z-10">
                <span className="text-[9px] sm:text-[10px] text-gray-500 flex items-center gap-1 cursor-help border-b border-dashed border-gray-600 hover:text-gray-300 transition-colors"
                  onMouseEnter={(e) => handleMouseEnterTooltip('mc', res, e)}
                  onMouseLeave={handleMouseLeaveTooltip}>
                  <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> 蒙特卡洛 2000x 推演
                </span>
                <div className="flex items-center gap-2 sm:gap-3">
                   <span className="text-[9px] sm:text-[10px] text-gray-400">止盈: <span className="text-green-400 font-mono font-bold">{res.mcResults.targetProb}%</span></span>
                   <span className="text-[9px] sm:text-[10px] text-gray-400">止损: <span className="text-red-400 font-mono font-bold">{res.mcResults.stopProb}%</span></span>
                </div>
              </div>

              <div className="bg-gray-950/80 rounded-lg p-2 sm:p-3 border border-gray-800 mb-3 sm:mb-4 relative z-10">
                <div className="flex justify-between items-center mb-2 sm:mb-3 border-b border-gray-800/50 pb-1.5 sm:pb-2">
                  <h4 className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1 uppercase font-semibold tracking-wider"><Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 纯正 SMC 狙击阵列</h4>
                  {renderRRRWithTooltip(res)}
                </div>
                
                {(() => {
                    const distATR = Math.abs(displayPrice - res.plan.entryPoint) / (res.metrics.rawAtr || 1);
                    
                    let sniperStatus = '';
                    let sniperColor = '';
                    let sniperBg = '';
                    let icon = '';

                    if (distATR > 1.5) {
                        sniperStatus = '未到伏击区 (绝对死等)';
                        sniperColor = 'text-gray-500';
                        sniperBg = 'bg-gray-900 border border-gray-800';
                        icon = '🔭';
                    } else if (distATR > 0.5 && distATR <= 1.5) {
                        sniperStatus = '逼近火力线 (正在测试)';
                        sniperColor = 'text-yellow-400';
                        sniperBg = 'bg-yellow-500/10 border border-yellow-500/30';
                        icon = '👀';
                    } else {
                        sniperStatus = '进入狙击区 (雷达激活)';
                        sniperColor = 'text-cyan-400 font-bold';
                        sniperBg = 'bg-cyan-500/20 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse';
                        icon = '🎯';
                    }

                    return (
                        <>
                          <div className={`mb-3 rounded p-2 flex items-center justify-center gap-2 ${sniperBg}`}>
                             <span className="text-sm">{icon}</span>
                             <span className={`text-[11px] sm:text-xs tracking-wide ${sniperColor}`}>{sniperStatus}</span>
                          </div>
                          <div className="mb-3 bg-black/40 rounded p-3 border border-indigo-500/30 flex flex-col items-center justify-center text-center relative overflow-hidden group/target">
                            <div className="absolute inset-0 bg-indigo-500/10 opacity-50 group-hover/target:opacity-100 transition-opacity"></div>
                            <span className="text-[9px] sm:text-[10px] text-indigo-300 font-bold uppercase tracking-widest relative z-10 mb-0.5">🎯 战术优先狙击点</span>
                            <span className="text-[10px] sm:text-xs text-gray-300 mb-1 relative z-10 font-bold">{res.plan.entryType}</span>
                            <span className="font-mono text-lg sm:text-xl text-cyan-400 font-black relative z-10 shadow-cyan-500/50 drop-shadow-md">${res.plan.entryPoint.toPrecision(5)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 sm:gap-2">
                            <div className="bg-gray-900 rounded p-1.5 border border-gray-800/50">
                              <div className="text-[9px] sm:text-[10px] text-gray-500 mb-0.5 sm:mb-1">距狙击位距 (Live)</div>
                              <div className={`font-mono text-xs sm:text-sm ${Math.abs(liveRiskDistance) < 2 ? 'text-yellow-400 font-bold animate-pulse' : Math.abs(liveRiskDistance) > 5 ? 'text-red-400' : 'text-gray-400'}`}>{liveRiskDistance > 0 ? '+' : ''}{liveRiskDistance}%</div>
                            </div>
                            <div className="bg-gray-900 rounded p-1.5 border border-gray-800/50">
                              <div className="text-[9px] sm:text-[10px] text-gray-500 mb-0.5 sm:mb-1">边界防守位 (Stop)</div>
                              <div className="font-mono text-xs sm:text-sm text-red-400">${res.plan.stopLoss.toPrecision(5)}</div>
                            </div>
                          </div>
                        </>
                    );
                })()}
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2 relative z-10">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  <div className="bg-gray-900 rounded p-1.5 sm:p-2 text-center border border-gray-800/50 flex justify-between items-center px-2 sm:px-3 relative overflow-hidden">
                    {res.lastTd && parseFloat(res.lastTd.aiScore) > 0 && (
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                    )}
                    <div className="text-[9px] sm:text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-600 hover:text-gray-300 transition-colors"
                      onMouseEnter={(e) => handleMouseEnterTooltip('ai', res, e)}
                      onMouseLeave={handleMouseLeaveTooltip}>TD-AI 胜率</div>
                    <div className={`font-mono text-[10px] sm:text-xs ${res.lastTd && parseFloat(res.lastTd.aiScore) >= 80 ? 'text-cyan-400 font-bold' : res.lastTd && parseFloat(res.lastTd.aiScore) >= 50 ? 'text-amber-400' : 'text-gray-500'}`}>
                       {res.lastTd && parseFloat(res.lastTd.aiScore) > 0 ? `${res.lastTd.aiScore}%` : '--'}
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded p-1.5 sm:p-2 text-center border border-gray-800/50 flex justify-between items-center px-2 sm:px-3">
                    <div className="text-[9px] sm:text-[10px] text-gray-500 cursor-help border-b border-dashed border-gray-600 hover:text-gray-300 transition-colors"
                      onMouseEnter={(e) => handleMouseEnterTooltip('beta', res, e)}
                      onMouseLeave={handleMouseLeaveTooltip}>走势关联(Beta)</div>
                    <div className={`font-mono text-[10px] sm:text-xs ${parseFloat(res.metrics.beta) < 0.3 ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}>{res.metrics.beta}</div>
                  </div>
                </div>

                {/* V21.0 订单流显微雷达组件 */}
                <div className="bg-gray-900 rounded p-2 sm:p-3 border border-gray-800/50 relative overflow-hidden">
                  <div className="text-[9px] sm:text-[10px] text-gray-400 mb-2.5 cursor-help flex justify-between items-center"
                    onMouseEnter={(e) => handleMouseEnterTooltip('taker', res, e)}
                    onMouseLeave={handleMouseLeaveTooltip}>
                    <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-purple-400" /> V21 狙击手火控雷达 (3m)</span>
                    <span className="text-[8px] text-gray-500 bg-black/50 px-1.5 py-0.5 rounded border border-gray-700/50">{res.isHL ? 'Hyperliquid' : 'Binance'}</span>
                  </div>
                  {(() => {
                     // 脉冲起搏器强制探查：打破旧版的停搏锁
                     const currentPulse = radarPulse; 
                     const flow = tickBufferRef.current[res.symbol];
                     
                     // 解除 HL 和网络降级下的无脑阻断
                     if (!flow || res.actualSymbol === 'CCI') return <div className="text-xs text-gray-600 font-mono text-center py-2 flex items-center justify-center gap-2"><RefreshCw className="w-3 h-3 animate-spin"/> 数据连线中...</div>;

                     const distToEntry = Math.abs(displayPrice - res.plan.entryPoint) / res.plan.entryPoint * 100;
                     const inKillZone = distToEntry <= 1.0; // 进入 1% 伏击圈才激活微观雷达

                     if (!inKillZone) {
                         return (
                             <div className="flex flex-col items-center justify-center py-3 bg-gray-950/50 rounded border border-dashed border-gray-800/80">
                                 <Radar className="w-4 h-4 text-gray-700 mb-1" />
                                 <span className="text-[9px] text-gray-600">距伏击点 &gt; 1%，微观雷达静默休眠</span>
                             </div>
                         );
                     }

                     const wCVD = flow.whaleCVD;
                     const rCVD = flow.retailCVD;
                     const hist = flow.history || [];
                     const histLen = hist.length;
                     // 获取过去3分钟的快照作为基准，若不足则用最新值
                     const compareIdx = Math.max(0, histLen - 3);
                     const baseW = histLen > 0 ? hist[compareIdx].w : wCVD;
                     const baseR = histLen > 0 ? hist[compareIdx].r : rCVD;

                     const wDelta = wCVD - baseW;
                     const rDelta = rCVD - baseR;
                     
                     // 应用动态归一化阈值
                     const threshold = res.metrics.cvdThreshold;

                     let triggerStatus = '伏击区火力侦察中...';
                     let triggerColor = 'text-yellow-500';
                     let triggerBg = 'bg-yellow-500/10 border-yellow-500/30';
                     let isFire = false;

                     if (res.direction === 'long') {
                         if (wDelta > threshold) { 
                             triggerStatus = '🚨 巨鲸点火 (开单!)'; triggerColor = 'text-green-400 font-black'; triggerBg = 'bg-green-500/20 border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.4)] animate-pulse'; isFire = true;
                         } else if (wDelta < -threshold * 0.5) {
                             triggerStatus = '⚠️ 巨鲸砸盘 (中止)'; triggerColor = 'text-red-400'; triggerBg = 'bg-red-500/10 border-red-500/30';
                         }
                     } else {
                         if (wDelta < -threshold) {
                             triggerStatus = '🚨 巨鲸狂砸 (开空!)'; triggerColor = 'text-red-400 font-black'; triggerBg = 'bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'; isFire = true;
                         } else if (wDelta > threshold * 0.5) {
                             triggerStatus = '⚠️ 巨鲸买入 (中止)'; triggerColor = 'text-green-400'; triggerBg = 'bg-green-500/10 border-green-500/30';
                         }
                     }

                     return (
                        <div className="space-y-2 mt-1">
                           <div className={`text-center py-1.5 rounded border mb-2 flex items-center justify-center gap-1.5 ${triggerBg}`}>
                               {isFire ? <Flame className={`w-3.5 h-3.5 ${triggerColor}`} /> : <Activity className={`w-3.5 h-3.5 ${triggerColor}`} />}
                               <span className={`text-[10px] ${triggerColor}`}>{triggerStatus}</span>
                           </div>
                           <div className="flex items-center justify-between gap-2.5">
                             <span className="text-[9px] text-purple-300 w-14 shrink-0 font-medium">3m巨鲸净量</span>
                             <span className={`font-mono text-[10px] flex-1 text-right ${wDelta > 0 ? 'text-teal-400 font-bold' : wDelta < 0 ? 'text-rose-400 font-bold' : 'text-gray-600'}`}>
                                {wDelta > 0 ? '+' : ''}{(wDelta/1000).toFixed(1)}k
                             </span>
                           </div>
                           <div className="flex items-center justify-between gap-2.5">
                             <span className="text-[9px] text-gray-500 w-14 shrink-0">3m散户净量</span>
                             <span className={`font-mono text-[9px] flex-1 text-right ${rDelta > 0 ? 'text-teal-400/70' : rDelta < 0 ? 'text-rose-400/70' : 'text-gray-600'}`}>
                                {rDelta > 0 ? '+' : ''}{(rDelta/1000).toFixed(1)}k
                             </span>
                           </div>
                        </div>
                     );
                  })()}
                </div>
              </div>
            </div>
          )}) : (
            <div className="col-span-full py-20 text-center border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
              <RefreshCw className="w-10 h-10 text-cyan-500/50 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300">正在接入 星际多点阵列节点...</h3>
              <p className="text-gray-500 text-sm mt-2">首次同步全网深度订单簿与高频 K 线数据</p>
            </div>
          )}
        </div>
      </div>

      {/* --- 📡 银河星际雷达面板 --- */}
      {isRadarOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-20">
          <div className="bg-gray-950 border border-indigo-500/30 rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl shadow-indigo-900/20 overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-900 to-indigo-950/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                    <Rocket className={`w-8 h-8 text-indigo-400 ${isRadarScanning ? 'animate-bounce' : ''}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">星际雷达 <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs font-mono border border-indigo-500/30">Top 200 漏斗算法</span></h2>
                    <p className="text-sm text-gray-400 mt-1">自动剔除深熊标的，全网侦测爆发前夕的高潜密码 (≥65分)</p>
                  </div>
                </div>
                <button onClick={closeRadar} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"><X/></button>
             </div>

             <div className="p-6 border-b border-gray-800 bg-[#0f1219]">
                <div className="flex justify-between text-sm mb-3">
                  <span className={`font-mono flex items-center gap-2 ${isRadarScanning ? 'text-indigo-400' : 'text-green-400'}`}>
                    {isRadarScanning && <RefreshCw className="w-4 h-4 animate-spin"/>} {radarStatus}
                  </span>
                  <span className="font-mono text-gray-400 font-bold">{Math.round(radarProgress)}%</span>
                </div>
                <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden border border-gray-800">
                   <div className="bg-gradient-to-r from-indigo-600 to-cyan-400 h-full transition-all duration-300 relative" style={{ width: `${radarProgress}%` }}>
                     <div className="absolute top-0 right-0 w-20 h-full bg-white/30 blur-md animate-pulse"></div>
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-6 bg-black/40">
               {radarResults.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-6">
                   <div className="relative">
                     <Radar className={`w-24 h-24 ${isRadarScanning ? 'animate-spin text-indigo-500/50' : 'text-gray-800'}`} />
                     {isRadarScanning && <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>}
                   </div>
                   <p className="text-lg tracking-widest">{isRadarScanning ? "正在深空探测高分标的..." : "当前市场暂无符合 V8 标准的黄金标的"}</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {radarResults.map(res => {
                     const isAdded = coins.includes(res.symbol);
                     const riskDist = (((res.currentPrice - res.plan.entryPoint) / res.plan.entryPoint) * 100).toFixed(1);
                     const isKillZone = Math.abs(riskDist) <= 1.5 && parseFloat(res.plan.rrr) >= 2.0 && res.score >= 60 && !res.rrrDetails.isFOMO;

                     return (
                     <div key={res.symbol} className={`bg-gray-900 border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group transition-all ${isKillZone ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-pulse' : 'border-gray-800 hover:border-indigo-500/40'}`}>
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${res.score >= 80 ? 'bg-cyan-400' : 'bg-indigo-500'}`} />
                        <div>
                          <div className="flex justify-between items-start pl-2 mb-4">
                            <div>
                              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
                                <span>{res.actualSymbol.replace(/\/USDC|USDT|USDC/gi, '')}</span>
                                {isKillZone && <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-400 px-1.5 py-0.5 rounded text-[9px] shrink-0 animate-bounce">🎯 临界共振</span>}
                                {res.crossZScore > 1.2 && <span className="bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50 px-1.5 py-0.5 rounded text-[9px] shrink-0 shadow-[0_0_10px_rgba(217,70,239,0.4)] animate-pulse">🔥 全网 Alpha</span>}
                              </h3>
                              <p className="text-gray-400 font-mono text-sm">${res.currentPrice.toPrecision(5)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-3xl font-black ${res.score >= 80 ? 'text-cyan-400' : 'text-indigo-400'}`}>{res.score}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 pl-2 mb-6">
                             {res.scoreBreakdown.filter(b => b.delta > 0).slice(0, 3).map((b,i) => (
                               <div key={i} className="flex items-center gap-2 text-xs bg-gray-950 px-2 py-1.5 rounded border border-gray-800">
                                 <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span><span className="text-gray-300" title={String(b.reason)}>{String(b.reason).length > 25 ? String(b.reason).substring(0, 25) + '...' : String(b.reason)}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                        <button onClick={() => addCoinToRoster(res.symbol)} disabled={isAdded} className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${isAdded ? 'bg-gray-950 text-gray-600 border border-gray-800 cursor-not-allowed' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-600 hover:text-white'}`}>
                          {isAdded ? '已在监控阵列' : '+ 编入山寨兵团'}
                        </button>
                     </div>
                   )})}
                 </div>
               )}
             </div>
          </div>
        </div>
      )}

      {/* --- 原有深度图表弹窗 --- */}
      {selectedCoin && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 p-20 bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="bg-gray-950 border border-gray-700 rounded-2xl w-[96vw] max-w-[1600px] h-[95vh] flex flex-col overflow-hidden shadow-2xl shadow-cyan-900/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 z-20">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {getZhName(selectedCoin.actualSymbol) && <span className="text-white">{getZhName(selectedCoin.actualSymbol)}</span>}
                  <span className={getZhName(selectedCoin.actualSymbol) ? 'text-gray-400 text-lg' : ''}>{selectedCoin.actualSymbol.replace(/\/USDC|USDT|USDC/gi, '')}</span>
                  <span className="text-sm font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{selectedCoin.isHL ? 'USDC' : 'USDT'}</span>
                  {selectedCoin.isHL && <span className="bg-purple-900/40 text-purple-400 px-2 py-0.5 text-xs rounded border border-purple-500/30 ml-2">Hyperliquid 节点直连</span>}
                  {isLiveMode && !selectedCoin.isHL && <span className="bg-green-500/20 text-green-400 px-2 py-0.5 text-xs rounded border border-green-500/50 flex items-center gap-1"><Radio className="w-3 h-3 animate-pulse"/> LIVE</span>}
                </h2>
                <div className="h-6 w-px bg-gray-700 hidden sm:block"></div>
                <div className="hidden sm:flex items-center gap-2 cursor-help"
                  onMouseEnter={(e) => handleMouseEnterTooltip('score', selectedCoin, e)}
                  onMouseLeave={handleMouseLeaveTooltip}>
                  <span className="text-sm text-gray-400 border-b border-dashed border-gray-600 pb-0.5">系统评级:</span>
                  <span className={`text-lg font-black ${selectedCoin.score >= 75 ? 'text-cyan-400' : selectedCoin.score >= 55 ? 'text-indigo-400' : selectedCoin.score >= 35 ? 'text-gray-400' : 'text-red-400'}`}>
                    {selectedCoin.score} 分
                  </span>
                </div>
              </div>
              <button onClick={() => { setSelectedCoin(null); setTooltipData(null); setMacroPosterData(null); setAiReportContent(null); setAiReasoningContent(null); setShowReasoning(false); setIsGeneratingReport(false); setIsEditingApiKey(false); setShowHeatmap(false); }} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
              <div className="w-full lg:w-[60%] xl:w-[65%] h-[35vh] md:h-[50vh] lg:h-full border-b lg:border-b-0 lg:border-r border-gray-800 bg-[#131722] relative p-1 shrink-0">
                {chartDataCache[selectedCoin.symbol] ? (
                  <TVChart data={chartDataCache[selectedCoin.symbol]} coinInfo={selectedCoin} showHeatmap={showHeatmap} />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-500"><RefreshCw className="w-8 h-8 animate-spin" /></div>
                )}
                <div className="absolute inset-0 pointer-events-none border border-transparent hover:border-gray-700 transition-colors z-10" />
              </div>

              {/* 右侧数据与操作面板 */}
              <div className="w-full lg:w-[40%] xl:w-[35%] p-3 sm:p-5 bg-gray-950 space-y-3 sm:space-y-5 overflow-y-auto relative z-20">
                <div className="bg-gradient-to-br from-indigo-950/40 to-cyan-950/20 border border-indigo-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(79,70,229,0.1)] relative">
                  {/* 标题行 */}
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-indigo-400" /> AI 量化投顾大模型
                      {getCurrentApiKey() && !isGeneratingReport && (
                        <button onClick={() => { setTempApiKey(getCurrentApiKey()); setIsEditingApiKey(!isEditingApiKey); }} className="ml-1 text-gray-500 hover:text-indigo-400 transition-colors" title="配置 API Key"><span className="text-sm">⚙️</span></button>
                      )}
                    </h4>
                    {(getCurrentApiKey() && !isEditingApiKey && !aiReportContent && !isGeneratingReport) && (
                      <button onClick={() => generateAIReport(selectedCoin)} className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 text-indigo-300 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-bold">
                        <Sparkles className="w-3.5 h-3.5" /> 深度推演
                      </button>
                    )}
                  </div>

                  {/* 供应商切换 Tabs */}
                  {!isGeneratingReport && (
                    <div className="flex gap-1 mb-3 bg-black/30 p-1 rounded-lg">
                      {Object.entries(AI_PROVIDERS).map(([key, cfg]) => {
                        const colorMap = { indigo: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50', green: 'bg-green-600/30 text-green-300 border-green-500/50', orange: 'bg-orange-600/30 text-orange-300 border-orange-500/50', cyan: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50' };
                        const isActive = selectedAiProvider === key;
                        return (
                          <button key={key} onClick={() => { setSelectedAiProvider(key); localStorage.setItem('star_ai_provider', key); setIsEditingApiKey(false); setAiReportContent(null); setAiReasoningContent(null); }}
                            className={`flex-1 text-[10px] font-bold py-1 rounded-md border transition-all ${isActive ? colorMap[cfg.color] : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* API Key 输入框 */}
                  {(!getCurrentApiKey() || isEditingApiKey) && !isGeneratingReport && (
                    <div className="mb-3 flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-indigo-500/30">
                      <input type="password" placeholder={`在此填入 ${AI_PROVIDERS[selectedAiProvider].label} API Key...`} value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { saveCurrentApiKey(tempApiKey.trim()); setIsEditingApiKey(false); }}}
                        className="flex-1 bg-transparent text-xs text-gray-200 px-2 py-1 focus:outline-none placeholder-gray-600" />
                      <button onClick={() => { saveCurrentApiKey(tempApiKey.trim()); setIsEditingApiKey(false); }} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap">保存</button>
                      {getCurrentApiKey() && isEditingApiKey && <button onClick={() => setIsEditingApiKey(false)} className="text-gray-400 hover:text-white pl-1 pr-2"><X className="w-3 h-3"/></button>}
                    </div>
                  )}

                  {/* 推理中动画 */}
                  {isGeneratingReport && (
                    <div className="py-6 text-center space-y-3">
                      <div className="relative mx-auto w-12 h-12">
                        <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-2 border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
                        <Brain className="absolute inset-0 m-auto w-5 h-5 text-indigo-400 animate-pulse" />
                      </div>
                      <div className="text-sm text-indigo-300 font-mono animate-pulse">{AI_PROVIDERS[selectedAiProvider].label} 神经网络交叉会诊中...</div>
                      {selectedAiProvider === 'deepseek' && <div className="text-[10px] text-cyan-500/70 animate-pulse">DeepSeek-R1 深度推理链激活中...</div>}
                    </div>
                  )}

                  {/* DeepSeek 推理内容折叠块 */}
                  {aiReasoningContent && !isGeneratingReport && (
                    <div className="mb-3">
                      <button onClick={() => setShowReasoning(r => !r)}
                        className="w-full flex items-center justify-between text-[10px] text-cyan-600 hover:text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 rounded-lg px-3 py-1.5 transition-colors">
                        <span className="flex items-center gap-1.5"><Brain className="w-3 h-3" /> DeepSeek 推理链 (Chain-of-Thought)</span>
                        <span>{showReasoning ? '▲ 收起' : '▼ 展开'}</span>
                      </button>
                      {showReasoning && (
                        <div className="mt-1 p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg max-h-48 overflow-y-auto">
                          <pre className="text-[10px] text-cyan-300/70 whitespace-pre-wrap leading-relaxed font-mono">{aiReasoningContent}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 报告内容 */}
                  {aiReportContent && (
                    <div className="mt-2 p-3 bg-black/40 rounded-lg border border-indigo-500/20">
                      {renderMarkdown(aiReportContent)}
                      <div className="mt-4 pt-3 border-t border-indigo-500/20 flex justify-between items-center">
                        <button onClick={() => generateMacroPoster(selectedCoin, aiReportContent)} disabled={isGeneratingMacro} className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${isGeneratingMacro ? 'bg-cyan-900/50 text-cyan-500 cursor-not-allowed' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 border border-cyan-500/30'}`}>
                          {isGeneratingMacro ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                          {isGeneratingMacro ? '正在光刻海报...' : '生成 Alpha 密报卡'}
                        </button>
                        <button onClick={() => generateAIReport(selectedCoin)} disabled={isGeneratingReport} className="text-[10px] text-gray-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"><RefreshCw className={`w-3 h-3 ${isGeneratingReport ? 'animate-spin' : ''}`} /> 重新推演</button>
                      </div>
                    </div>
                  )}

                  {/* 底部工具栏（无报告时显示）*/}
                  {!aiReportContent && !isGeneratingReport && (
                    <div className="flex justify-between items-end mt-2">
                      <button onClick={() => setShowHeatmap(!showHeatmap)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-bold ${showHeatmap ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-amber-400'}`}>
                        <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'animate-pulse text-amber-400' : 'text-gray-500'}`} /> 高杠杆清算热力图 {showHeatmap ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => generateMacroPoster(selectedCoin, null)} disabled={isGeneratingMacro} className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 px-2 py-1 rounded transition-colors flex items-center gap-1"><Camera className="w-3 h-3" /> 海报</button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                     <h3 className="text-[10px] text-gray-400 mb-2 flex items-center gap-1"><Target className="w-3 h-3"/> {selectedCoin.direction === 'long' ? '下方冰山买单墙' : '上方冰山卖单墙'}</h3>
                     {selectedCoin.buyWall.price > 0 ? (
                       <>
                        <div className="flex justify-between items-center mb-1"><span className="text-xs text-gray-500">防守阻力</span><span className="text-sm font-mono text-cyan-400">${selectedCoin.buyWall.price.toPrecision(5)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs text-gray-500">墙体金额</span><span className="text-sm font-mono text-gray-300">{(selectedCoin.buyWall.value / 1000).toFixed(1)}k U</span></div>
                       </>
                     ) : (
                       <div className="text-xs text-gray-500 mt-3 text-center">{selectedCoin.direction === 'long' ? '下方 10% 暂无巨额挂单' : '上方 10% 暂无巨额挂单'}</div>
                     )}
                   </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden p-4">
                   <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><BarChart2 className="w-3.5 h-3.5" /> VPVR 筹码分布 (Volume Profile)</h3>
                  <div className="h-40 flex flex-col justify-between py-1 relative border-l border-gray-800 pl-2">
                    {selectedCoin.vpvrData && selectedCoin.vpvrData.map((v, i) => {
                      const isEntryZone = Math.abs(v.price - selectedCoin.plan.entryPoint) <= ((selectedCoin.vpvrData[0].price - selectedCoin.vpvrData[selectedCoin.vpvrData.length-1].price) / 60 / 2);
                      return (
                      <div key={i} className="flex items-center w-full relative group flex-1 min-h-[1px] my-[0.5px]">
                        <div className="absolute left-0 h-full bg-cyan-900/50 rounded-r transition-all group-hover:bg-cyan-600/60" style={{ width: `${v.normalizedVol * 100}%` }}></div>
                        {isEntryZone && <div className="absolute left-0 h-[2px] bg-cyan-400 rounded-r z-20 top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(34,211,238,1)]" style={{ width: `100%` }}></div>}
                        <div className="absolute left-1 text-[8px] text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">Vol: {(v.volume/1000).toFixed(1)}K</div>
                        {i % 10 === 0 && <div className="absolute -left-[50px] text-[8px] text-gray-500/50 font-mono w-[45px] text-right pointer-events-none">{v.price.toPrecision(4)}</div>}
                      </div>
                    )})}
                  </div>
                  <div className="mt-3 text-[10px] text-gray-500 flex justify-between items-center border-t border-gray-800/50 pt-2">
                     <span>高亮发光线 = 计划建仓位</span>
                     <span className="font-mono text-cyan-400 font-bold">${selectedCoin.plan.entryPoint.toPrecision(5)}</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 shadow-inner">
                  <h4 className="text-xs text-gray-400 mb-3 flex items-center gap-1 uppercase font-semibold"><Calculator className="w-3.5 h-3.5" /> 连续时间分数半凯利 (Fractional Kelly)</h4>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 block mb-1">总资金 (USDT)</label>
                      <input type="number" value={totalCapital} onChange={(e) => setTotalCapital(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 block mb-1">人工风控限额 (%)</label>
                      <input type="number" value={riskPerTrade} onChange={(e) => setRiskPerTrade(Number(e.target.value))} step="0.5" className="w-full bg-gray-950 border border-gray-700 rounded p-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500" />
                    </div>
                  </div>

                  {(() => {
                    const winRate = parseFloat(selectedCoin.mcResults.targetProb) / 100;
                    const odds = parseFloat(selectedCoin.plan.rrr);
                    let kellyPct = 0;
                    if (odds > 0 && winRate > 0) kellyPct = winRate - ((1 - winRate) / odds);
                    
                    const volatilityDrag = Math.max(0.2, 1 - (parseFloat(selectedCoin.metrics.atr) / selectedCoin.currentPrice * 5));
                    const fractionalKelly = kellyPct > 0 ? kellyPct * 0.5 * volatilityDrag : 0; 
                    
                    const recommendedRisk = fractionalKelly > 0 ? (fractionalKelly * 100).toFixed(1) : 0;
                    const isKellyWarning = fractionalKelly <= 0;
                    const pos = calculatePosition(selectedCoin.plan.entryPoint, selectedCoin.plan.stopLoss, totalCapital, riskPerTrade);
                    
                    return (
                      <div className="bg-gray-950/50 rounded p-2.5 border border-gray-800/50">
                        <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-gray-800/50">
                          <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1"><Brain className="w-3 h-3"/> Kelly 引擎建议</span>
                          <span className={`font-mono text-xs font-bold ${isKellyWarning ? 'text-red-400' : 'text-green-400'}`}>{isKellyWarning ? '不建议操作 (期望为负)' : `最佳风控比例: ${recommendedRisk}%`}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1"><span className="text-[10px] text-gray-500">{selectedCoin.direction === 'long' ? '计划入场买单量:' : '计划开空合约量:'}</span><span className="font-mono text-sm text-cyan-400 font-bold">{pos.coins}</span></div>
                        <div className="flex justify-between items-center mb-1"><span className="text-[10px] text-gray-500">占用保证金 (价值):</span><span className="font-mono text-xs text-gray-300">${pos.value}</span></div>
                        <div className="flex justify-between items-center border-t border-gray-800/50 pt-1 mt-1"><span className="text-[10px] text-red-500/70">若打损最大亏损:</span><span className="font-mono text-xs text-red-400">-${pos.riskAmount}</span></div>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-800/50">
                    <div className="text-[10px] text-gray-500 mb-1 cursor-help inline-block border-b border-dashed border-gray-600 hover:text-gray-300 transition-colors"
                      onMouseEnter={(e) => handleMouseEnterTooltip('beta', selectedCoin, e)}
                      onMouseLeave={handleMouseLeaveTooltip}>Pearson 走势相关性</div>
                    <div className={`font-mono text-sm ${parseFloat(selectedCoin.metrics.beta) < 0.3 ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}>{selectedCoin.metrics.beta}</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-800/50">
                    <div className="text-[10px] text-gray-500 mb-1">Z-Score 布林挤压度</div>
                    <div className="font-mono text-sm text-gray-300">{selectedCoin.metrics.bbw}</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 🚀 终极武器：全局悬浮传送门 --- */}
      {tooltipData && tooltipData.res && (
        <div 
           className={`fixed z-[9999] pointer-events-auto transition-all duration-200 ease-out ${tooltipData.rect.top < 380 ? '-translate-x-1/2 pt-5' : '-translate-x-1/2 -translate-y-full pb-5'}`} 
           style={{ left: tooltipData.rect.left + tooltipData.rect.width / 2, top: tooltipData.rect.top < 380 ? tooltipData.rect.bottom : tooltipData.rect.top }}
           onMouseEnter={handleTooltipWindowEnter}
           onMouseLeave={handleTooltipWindowLeave}
        >
          {/* 透明桥 (Invisible Bridge) 填补悬浮间隙 */}
          <div className="absolute inset-0 -z-10 bg-transparent" style={{ top: tooltipData.rect.top < 380 ? '-20px' : 'auto', bottom: tooltipData.rect.top >= 380 ? '-20px' : 'auto', height: 'calc(100% + 20px)' }}></div>
          
          <div className="relative z-10">
            {/* AI 面板 */}
            {tooltipData.type === 'ai' && tooltipData.res.lastTd && (
              <div className="w-[290px] md:w-[320px] bg-gray-950/98 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.9)] p-4 text-left animate-in fade-in zoom-in-95 duration-200">
                <div className="text-xs font-bold text-cyan-400 mb-3 pb-2 border-b border-gray-800 flex items-center gap-1.5"><Brain className="w-4 h-4"/> TD-Matrix AI 胜率引擎</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold mb-1">[AI 因子解析]</div>
                    <div className="text-[11px] text-gray-400 leading-relaxed bg-black/50 p-2 rounded border border-gray-800">当前测算胜率 <strong>{tooltipData.res.lastTd.aiScore}%</strong>。该模型综合考量了：当前是否触发 TD 序列极限、机构订单流(CVD)是否出现底层冰山吸收、以及是否完成对前低/前高的流动性扫荡。</div>
                  </div>
                </div>
              </div>
            )}
            {/* RRR 面板 */}
            {tooltipData.type === 'rrr' && tooltipData.res.rrrDetails && (
              <div className="w-[290px] md:w-[320px] bg-gray-950/98 backdrop-blur-xl border border-indigo-500/50 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.9)] p-4 text-left animate-in fade-in zoom-in-95 duration-200">
                <div className="text-xs font-bold text-cyan-400 mb-3 pb-2 border-b border-gray-800 flex items-center gap-1.5"><Brain className="w-4 h-4"/> V11 盈亏比推演引擎</div>
                <div className="space-y-3">
                  <div><div className="text-[10px] text-gray-500 font-bold mb-1">[1. 波动基准]</div><div className="text-xs text-gray-300 flex justify-between"><span>100周期平滑ATR:</span><span className="font-mono text-cyan-400">${tooltipData.res.rrrDetails.smoothedATR.toPrecision(4)}</span></div></div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold mb-1">[2. SMC 机构级顺序狙击点]</div>
                    <div className="text-[11px] text-gray-300 bg-gray-900/50 p-2 rounded border border-gray-800 mb-2 mt-1">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-1"><Target className="w-3.5 h-3.5"/> 顺位最优目标点</div>
                      <div className="text-gray-400 mb-1">{tooltipData.res.plan.entryType}</div>
                      <div className="font-mono text-lg text-white shadow-cyan-500/50 drop-shadow-md">${tooltipData.res.plan.entryPoint.toPrecision(5)}</div>
                    </div>
                    {tooltipData.res.plan.smcOB && (
                      <div className="text-[9px] text-rose-300/90 bg-rose-950/40 px-1.5 py-1.5 rounded mt-1.5 border border-rose-800/50 flex flex-col gap-0.5">
                        <span className="font-bold flex items-center gap-1 text-rose-400 animate-pulse">🛡️ ATR防爆提纯阵列 (Defensive Refinement)</span>
                        <span className="leading-tight text-gray-400">底层系统根据您配置的 Pine Script 逻辑，已过滤超过 2x/3x ATR 宽度的危险雷区，并将挂单区<strong className="text-rose-400">大幅向内提纯</strong>，杜绝滑点被套。</span>
                      </div>
                    )}
                    {tooltipData.res.rrrDetails.isFOMO && (
                      <>
                        <div className="text-[9px] text-yellow-500/80 bg-yellow-900/20 px-1 py-0.5 rounded mt-1.5 border border-yellow-700/30">*警告: 现货当前并未在折扣区，严禁无脑市价追入，遵守死等机制。</div>
                        <div className="flex items-center justify-between text-[10px] mt-2 pt-1 border-t border-gray-800/50"><span className="text-gray-500">现价直接追入盈亏比:</span><span className="font-mono font-bold text-red-400">{tooltipData.res.rrrDetails.liveRRR} (高危)</span></div>
                      </>
                    )}
                    <div className="text-xs text-gray-300 flex justify-between mt-1.5 pt-1.5 border-t border-gray-800/50"><span>机构极值防守位 (Stop):</span><span className="font-mono text-red-400">${tooltipData.res.plan.stopLoss.toPrecision(5)}</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold mb-1">[3. 环境判定 - 吃肉空间]</div>
                    <div className="text-[11px] text-gray-400 flex justify-between"><span>144宏观均线(ALMA):</span><span className="font-mono">${tooltipData.res.rrrDetails.alma144?.toPrecision(5) || 'N/A'}</span></div>
                    <div className="mt-2 text-[10px] leading-relaxed text-gray-400 bg-black/50 p-2 rounded border border-gray-800"><span className="text-gray-300 font-bold">逻辑: </span>{String(tooltipData.res.rrrDetails.regimeReason)}</div>
                    <div className="text-xs text-gray-200 flex justify-between mt-1 pt-1 border-t border-gray-800/50"><span>目标推演价:</span><span className="font-mono text-green-400">${tooltipData.res.rrrDetails.targetPrice.toPrecision(5)}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* MC 面板 */}
            {tooltipData.type === 'mc' && tooltipData.res.mcResults && (
              <div className="w-[290px] md:w-[320px] bg-gray-950/98 backdrop-blur-xl border border-indigo-500/50 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.9)] p-4 text-left animate-in fade-in zoom-in-95 duration-200">
                <div className="text-xs font-bold text-cyan-400 mb-3 pb-2 border-b border-gray-800 flex items-center gap-1.5"><Layers className="w-4 h-4"/> 历史自举法 2000x 随机推演</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold mb-1">[2. 平行宇宙设定]</div>
                    <div className="text-[11px] text-gray-300 flex justify-between"><span>推演次数:</span><span className="font-mono">2,000 条未来轨迹</span></div>
                    <div className="text-[11px] text-gray-300 flex justify-between mt-0.5"><span>单步波动率:</span><span className="font-mono text-cyan-400">{tooltipData.res.mcResults.stepVol}%</span></div>
                  </div>
                  <div className="pt-2 border-t border-gray-800">
                    <div className="text-[10px] text-gray-500 font-bold mb-2">[4. 2000 次时空推演结果]</div>
                    <div className="flex justify-between items-center text-[11px]"><span className="text-gray-400">🟢 率先触达止盈:</span><span className="font-mono text-green-400 font-bold">{tooltipData.res.mcResults.targetProb}%</span></div>
                    <div className="flex justify-between items-center text-[11px] mt-1"><span className="text-gray-400">🔴 率先触达止损:</span><span className="font-mono text-red-400 font-bold">{tooltipData.res.mcResults.stopProb}%</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Score 面板 */}
            {tooltipData.type === 'score' && tooltipData.res.scoreBreakdown && (
              <div className="w-[290px] md:w-[320px] bg-gray-950/98 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.9)] p-4 text-left animate-in fade-in zoom-in-95 duration-200">
                <div className="text-xs font-bold text-cyan-400 mb-3 pb-2 border-b border-gray-800 flex items-center justify-between"><span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> V12 对数平滑评分明细</span><span className="font-mono text-gray-500">基准分 50</span></div>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {tooltipData.res.scoreBreakdown.length > 0 ? (
                    tooltipData.res.scoreBreakdown.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-xs bg-gray-900/50 rounded p-2 border border-gray-800/50"><span className="text-gray-400 truncate pr-2" title={String(item.reason)}>{String(item.reason)}</span><span className={`font-mono font-bold whitespace-nowrap ${item.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>{item.delta > 0 ? '+' : ''}{item.delta}</span></div>
                    ))
                  ) : <div className="text-center text-gray-500 text-xs py-2">无特殊加减分项</div>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center"><span className="text-xs text-gray-500">平滑折叠后最终得分</span><span className={`text-lg font-black ${tooltipData.res.score >= 75 ? 'text-cyan-400' : tooltipData.res.score >= 55 ? 'text-indigo-400' : tooltipData.res.score >= 35 ? 'text-gray-400' : 'text-red-400'}`}>{tooltipData.res.score}</span></div>
              </div>
            )}

            {/* Beta 面板 */}
            {tooltipData.type === 'beta' && (
              <div className="w-[290px] md:w-[320px] bg-gray-950/98 backdrop-blur-xl border border-indigo-500/50 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.9)] p-4 text-left animate-in fade-in zoom-in-95 duration-200">
                <div className="text-xs font-bold text-indigo-400 mb-3 pb-2 border-b border-gray-800 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Pearson 走势相关性</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold mb-1">[量化解读]</div>
                    <div className="flex justify-between items-center text-[11px] mt-1.5"><span className="text-gray-400">&gt; 0.7:</span><span className="text-red-400">高度联动 (随波逐流)</span></div>
                    <div className="flex justify-between items-center text-[11px] mt-1.5"><span className="text-gray-400">0.3 - 0.7:</span><span className="text-gray-300">正常联动</span></div>
                    <div className="flex justify-between items-center text-[11px] mt-1.5"><span className="text-gray-400">&lt; 0.3:</span><span className="text-indigo-400 font-bold tracking-wide">独立行情 (Alpha 抱团)</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Taker 面板 */}
            {tooltipData.type === 'taker' && (
              <div className="w-[300px] md:w-[340px] bg-gray-950/98 backdrop-blur-xl border border-teal-500/50 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.9)] p-4 text-left animate-in fade-in zoom-in-95 duration-200">
                <div className="text-xs font-bold text-teal-400 mb-3 pb-2 border-b border-gray-800 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> 逐笔微观订单流 (分层 CVD)</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold mb-1">[底层指标：真实归集交易 (aggTrade) 推演]</div>
                    <div className="text-[11px] text-gray-300 leading-relaxed bg-black/50 p-2.5 rounded border border-gray-800 mt-2">
                       系统目前直连了 Binance 节点的 <strong className="text-teal-400">毫秒级底层逐笔数据</strong>。通过将每一笔真实的资金碰撞，按成交金额强制剥离为两个阶层：<br/><br/>
                       <span className="text-purple-400 font-bold">1. 巨鲸层 (&gt; 50,000 U/笔)</span>：代表主力资金的真实意图。<br/>
                       <span className="text-gray-400 font-bold">2. 散户层 (&lt; 10,000 U/笔)</span>：代表情绪化噪音。<br/><br/>
                       当图表上出现<strong className="text-rose-400">巨鲸疯狂做负 CVD（派发）</strong>，而<strong className="text-teal-400">散户在做正 CVD（接盘）</strong>时，这种背离是所有“高位诱多/洗盘”形态中最不可被伪造的终极信号。
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
