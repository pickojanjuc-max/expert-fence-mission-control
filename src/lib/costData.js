/**
 * Cost/pricing data — parsed from cost_price_master.csv
 * This is the complete pricing table used by the BOM engine.
 *
 * Format: SKU -> { sell: number, cost: number, img: string }
 * If sell_price_aud is 0 but cost > 0, sell defaults to cost * 1.6 (60% markup).
 * Image URLs are populated from the CSV; variants without images use black variant fallback.
 */

const RAW_COSTS = [
  // Glass gate panels
  { sku: '08SLG-0750', cost: 24.63, sell: 34.48, img: '' },
  { sku: '08SLG-0834', cost: 26.60, sell: 37.24, img: '' },
  { sku: '08SLG-0890', cost: 27.91, sell: 39.07, img: '' },
  { sku: '08SLG-1000', cost: 31.36, sell: 43.90, img: '' },
  // Glass panels 12mm (12N series) — all have cost and sell
  { sku: '12N-0200', cost: 11.05, sell: 15.47, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0200.JPG' },
  { sku: '12N-0250', cost: 13.81, sell: 19.33, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0250.JPG' },
  { sku: '12N-0300', cost: 16.57, sell: 23.20, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0300.JPG' },
  { sku: '12N-0350', cost: 19.34, sell: 27.08, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0350.JPG' },
  { sku: '12N-0400', cost: 22.10, sell: 30.94, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0400.JPG' },
  { sku: '12N-0450', cost: 24.87, sell: 34.82, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0450.JPG' },
  { sku: '12N-0500', cost: 27.64, sell: 38.70, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0500.JPG' },
  { sku: '12N-0550', cost: 30.39, sell: 42.55, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0550.JPG' },
  { sku: '12N-0600', cost: 33.16, sell: 46.42, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0600.JPG' },
  { sku: '12N-0650', cost: 35.92, sell: 50.29, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0650.JPG' },
  { sku: '12N-0700', cost: 38.69, sell: 54.17, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0700.JPG' },
  { sku: '12N-0750', cost: 41.44, sell: 58.02, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0750.JPG' },
  { sku: '12N-0800', cost: 44.20, sell: 61.88, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0800.JPG' },
  { sku: '12N-0850', cost: 46.97, sell: 65.76, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0850.JPG' },
  { sku: '12N-0900', cost: 49.72, sell: 69.61, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0900.JPG' },
  { sku: '12N-0950', cost: 52.49, sell: 73.49, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-0950.JPG' },
  { sku: '12N-1000', cost: 55.26, sell: 77.36, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1000.JPG' },
  { sku: '12N-1050', cost: 58.02, sell: 81.23, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1050.JPG' },
  { sku: '12N-1100', cost: 60.78, sell: 85.09, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1100.JPG' },
  { sku: '12N-1150', cost: 63.55, sell: 88.97, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1150.JPG' },
  { sku: '12N-1200', cost: 66.31, sell: 92.83, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1200.JPG' },
  { sku: '12N-1250', cost: 69.08, sell: 96.71, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1250.JPG' },
  { sku: '12N-1300', cost: 71.84, sell: 100.58, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1300.JPG' },
  { sku: '12N-1350', cost: 74.60, sell: 104.44, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1350.JPG' },
  { sku: '12N-1400', cost: 77.36, sell: 108.30, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1400.JPG' },
  { sku: '12N-1450', cost: 80.13, sell: 112.18, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1450.JPG' },
  { sku: '12N-1500', cost: 82.88, sell: 116.03, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1500.JPG' },
  { sku: '12N-1550', cost: 85.65, sell: 119.91, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1550.JPG' },
  { sku: '12N-1600', cost: 88.42, sell: 123.79, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1600.JPG' },
  { sku: '12N-1650', cost: 91.18, sell: 127.65, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1650.JPG' },
  { sku: '12N-1700', cost: 93.95, sell: 131.53, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1700.JPG' },
  { sku: '12N-1750', cost: 96.70, sell: 135.38, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1750.JPG' },
  { sku: '12N-1800', cost: 99.46, sell: 139.24, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1800.JPG' },
  { sku: '12N-1850', cost: 102.23, sell: 143.12, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1850.JPG' },
  { sku: '12N-1900', cost: 104.99, sell: 146.99, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1900.JPG' },
  { sku: '12N-1950', cost: 107.75, sell: 150.85, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-1950.JPG' },
  { sku: '12N-2000', cost: 110.52, sell: 154.73, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/12N-2000.JPG' },
  // Hinges
  { sku: 'PSC-S155-GG-B', cost: 159.00, sell: 222.60, img: '' },
  { sku: 'PSC-S155-GG-P', cost: 149.00, sell: 208.60, img: '' },
  { sku: 'PSC-S155-GG-S', cost: 149.00, sell: 208.60, img: '' },
  { sku: 'PSC-S155-W-B', cost: 159.00, sell: 222.60, img: '' },
  { sku: 'PSC-S155-W-P', cost: 149.00, sell: 208.60, img: '' },
  { sku: 'PSC-S155-W-S', cost: 149.00, sell: 208.60, img: '' },
  // Hinge panels
  { sku: '12NH-0600', cost: 37.71, sell: 52.79, img: '' },
  { sku: '12NH-0800', cost: 50.28, sell: 70.39, img: '' },
  { sku: '12NH-1000', cost: 61.17, sell: 85.64, img: '' },
  { sku: '12NH-1100', cost: 66.54, sell: 93.16, img: '' },
  { sku: '12NH-1200', cost: 71.93, sell: 100.70, img: '' },
  { sku: '12NH-1300', cost: 77.29, sell: 108.21, img: '' },
  { sku: '12NH-1400', cost: 82.66, sell: 115.72, img: '' },
  { sku: '12NH-1500', cost: 88.04, sell: 123.26, img: '' },
  { sku: '12NH-1600', cost: 93.41, sell: 130.77, img: '' },
  { sku: '12NH-1700', cost: 99.25, sell: 138.95, img: '' },
  { sku: '12NH-1800', cost: 104.16, sell: 145.82, img: '' },
  // Latches
  { sku: 'MR-FL90E-B', cost: 58.01, sell: 81.21, img: '' },
  { sku: 'MR-FL90E-MW', cost: 58.01, sell: 81.21, img: '' },
  { sku: 'MR-FL90E-P', cost: 54.98, sell: 76.97, img: '' },
  { sku: 'MR-FL90E-S', cost: 54.98, sell: 76.97, img: '' },
  { sku: 'MR-FL90I-B', cost: 60.43, sell: 84.60, img: '' },
  { sku: 'MR-FL90I-MW', cost: 60.43, sell: 84.60, img: '' },
  { sku: 'MR-FL90I-P', cost: 56.40, sell: 78.96, img: '' },
  { sku: 'MR-FL90I-S', cost: 56.40, sell: 78.96, img: '' },
  { sku: 'MR-FLGG-B', cost: 48.33, sell: 67.66, img: '' },
  { sku: 'MR-FLGG-MW', cost: 48.33, sell: 67.66, img: '' },
  { sku: 'MR-FLGG-P', cost: 45.30, sell: 63.42, img: '' },
  { sku: 'MR-FLGG-S', cost: 43.28, sell: 60.59, img: '' },
  { sku: 'MR-WGL-B', cost: 48.33, sell: 67.66, img: '' },
  { sku: 'MR-WGL-MW', cost: 48.33, sell: 67.66, img: '' },
  { sku: 'MR-WGL-P', cost: 42.27, sell: 59.18, img: '' },
  { sku: 'MR-WGL-S', cost: 40.26, sell: 56.36, img: '' },
  // Spigots
  { sku: 'MAD-DR-RAISED-P', cost: 3.17, sell: 4.44, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-DR-RAISED-P.JPG' },
  { sku: 'MAD-S-P', cost: 39.52, sell: 55.33, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-S-P.JPG' },
  // Flat top tubular pool fencing (BLACK — base SKUs)
  { sku: 'SS-1200-GC-2PK', cost: 27.56, sell: 38.58, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-1200-GC-2PK.JPG' },
  { sku: 'SS-1300-BP-B', cost: 17.90, sell: 25.06, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-1300-BP-B.JPG' },
  { sku: 'SS-1600-BP-B', cost: 21.90, sell: 30.66, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-1600-BP-B.JPG' },
  { sku: 'SS-1800-B', cost: 17.30, sell: 24.22, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-1800-B.JPG' },
  { sku: 'SS-2100-B', cost: 21.50, sell: 30.10, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-2100-B.JPG' },
  { sku: 'SS-BA-B', cost: 0.82, sell: 1.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BA-B.JPG' },
  { sku: 'SS-BH4-B', cost: 4.11, sell: 5.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BH4-B.JPG' },
  { sku: 'SS-BSWIV-HORIZ-B', cost: 4.42, sell: 6.19, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BSWIV-HORIZ-B.JPG' },
  { sku: 'SS-BSWIV-VERT-B', cost: 4.42, sell: 6.19, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BSWIV-VERT-B.JPG' },
  { sku: 'SS-BV-B', cost: 1.36, sell: 1.90, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BV-B.JPG' },
  { sku: 'SS-DC-B', cost: 4.49, sell: 6.29, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-DC-B.JPG' },
  { sku: 'SS-FTG-0975-B', cost: 46.80, sell: 65.52, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTG-0975-B.JPG' },
  { sku: 'SS-FTG-1470-B', cost: 82.25, sell: 115.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTG-1470-B.JPG' },
  { sku: 'SS-FTP-2450-B', cost: 73.90, sell: 121.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTP-2450-B.JPG' },
  { sku: 'SS-FTP-3000-B', cost: 103.95, sell: 154.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTP-3000-B.JPG' },
  { sku: 'SS-FTR-1400HT-B', cost: 130.00, sell: 194.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTR-1400HT-B.JPG' },
  { sku: 'SS-FTR-1800HT-B', cost: 150.80, sell: 215.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTR-1800HT-B.JPG' },
  { sku: 'SS-LEG', cost: 5.39, sell: 7.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-LEG.JPG' },
  { sku: 'SS-TD-EXT-B', cost: 0.62, sell: 5.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-TD-EXT-B.JPG' },
  { sku: 'ML-TL-TC-H-AT', cost: 75.50, sell: 105.70, img: 'https://glassoutletonline.com.au/pictures/orig/ml-tl-tc-h-at.jpg' },
  // Blade fencing
  { sku: 'BLA-GATE-0975-1200-B', cost: 119.00, sell: 166.60, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BLA-GATE-0975-1200-B.JPG' },
  { sku: 'BLA-PNL-2200-1200-B', cost: 189.00, sell: 264.60, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BLA-PNL-2200-1200-B.JPG' },
  { sku: 'FF-BH-OPEN-4PK-B', cost: 8.90, sell: 12.46, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/FF-BH-OPEN-4PK-B.JPG' },
  // Dress rings + covers (Tubular black)
  { sku: 'XP-DR-B', cost: 2.35, sell: 3.29, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DR-B.JPG' },
  // Barr fencing (BLACK)
  { sku: 'BR-PANEL-2205-1200-B', cost: 196.56, sell: 275.18, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-PANEL-2205-1200-B.JPG' },
  { sku: 'BR-BR25-B-4PK', cost: 8.48, sell: 11.87, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-BR25-B-4PK.JPG' },
  { sku: 'BR-GATE-0975-1200-B', cost: 124.70, sell: 174.58, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-GATE-0975-1200-B.JPG' },
  { sku: 'BR-1800-B', cost: 33.18, sell: 46.45, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-1800-B.JPG' },
  { sku: 'BR-1280-BP-B', cost: 31.10, sell: 43.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-1280-BP-B.JPG' },
  { sku: 'BR-DR-B', cost: 2.02, sell: 2.83, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-DR-B.JPG' },
  { sku: 'BR-DC-2P-B', cost: 4.44, sell: 6.22, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-DC-2P-B.JPG' },
  // Stainless wire balustrade
  { sku: 'BW-S1193.2-100', cost: 77.60, sell: 108.64, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-S1193.2-100.JPG' },
  { sku: 'BW-S1193.2-305', cost: 186.16, sell: 260.62, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-S1193.2-305.JPG' },
  { sku: 'BW-5010-972D-BP-P', cost: 61.76, sell: 86.46, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-5010-972D-BP-P.JPG' },
  { sku: 'BW-5010-TP-P', cost: 8.89, sell: 12.45, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-5010-TP-P.JPG' },
  { sku: 'BW-FTM5-3.2', cost: 1.24, sell: 1.74, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-FTM5-3.2.JPG' },
  { sku: 'BW-M6X60-LS', cost: 0.78, sell: 1.09, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-M6X60-LS.JPG' },
  { sku: 'BW-RSM5-3.2', cost: 2.91, sell: 4.07, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-RSM5-3.2.JPG' },
  { sku: 'BW-5010-1000BP-P', cost: 0, sell: 0, img: '' },  // custom dropper 1000mm — pricing TBC
  // Style 4 — Lag screw threaded terminals (timber posts)
  { sku: 'BW-M6LST-L', cost: 1.01, sell: 1.41, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-M6LST-L.JPG' },
  { sku: 'BW-M6LST-R', cost: 1.01, sell: 1.41, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-M6LST-R.JPG' },
  // Style 5 — Threaded terminals (M6 nutsert / drilled post)
  { sku: 'BW-TTM6-3.2-L', cost: 0.96, sell: 1.35, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-TTM6-3.2-L.JPG' },
  { sku: 'BW-TTM6-3.2-R', cost: 0.96, sell: 1.35, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-TTM6-3.2-R.JPG' },
  { sku: 'BW-M6RIVNUT-L', cost: 0.34, sell: 0.47, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-M6RIVNUT-L.JPG' },
  { sku: 'BW-M6RIVNUT-R', cost: 0.34, sell: 0.47, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BW-M6RIVNUT-R.JPG' },
  // White tubular variants (zero cost — sell only) — using black variant fallback
  { sku: 'XP-1300-BP-W', cost: 0, sell: 30.06, img: '' },
  { sku: 'XP-DR-W', cost: 0, sell: 2.35, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DR-B.JPG' },
  { sku: 'XP-DC-2P-W', cost: 0, sell: 5.11, img: '' },
  { sku: 'TC-H-AT-2L-W', cost: 0, sell: 31.78, img: '' },
  { sku: 'ML-TL-W', cost: 0, sell: 110.19, img: '' },
  // Monument tubular variants — using black variant fallback
  { sku: 'SS-1200-GC-2PK-MN', cost: 0, sell: 35.26, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-1200-GC-2PK.JPG' },
  { sku: 'SS-1200-GC-2PK-W', cost: 0, sell: 35.26, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-1200-GC-2PK.JPG' },
  { sku: 'SS-1300-BP-MN', cost: 0, sell: 24.86, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-1300-BP-B.JPG' },
  { sku: 'SS-1600-BP-MN', cost: 0, sell: 26.94, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-1600-BP-B.JPG' },
  { sku: 'SS-1800-MN', cost: 0, sell: 19.45, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-1800-B.JPG' },
  { sku: 'SS-2100-MN', cost: 0, sell: 23.82, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-2100-B.JPG' },
  { sku: 'SS-BH4-MN', cost: 0, sell: 5.10, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BH4-B.JPG' },
  { sku: 'SS-BH4-W', cost: 0, sell: 5.10, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BH4-B.JPG' },
  { sku: 'SS-BSWIV-HORIZ-MN', cost: 0, sell: 4.68, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BSWIV-HORIZ-B.JPG' },
  { sku: 'SS-BSWIV-HORIZ-W', cost: 0, sell: 4.68, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BSWIV-HORIZ-B.JPG' },
  { sku: 'SS-BSWIV-VERT-MN', cost: 0, sell: 4.68, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BSWIV-VERT-B.JPG' },
  { sku: 'SS-BSWIV-VERT-W', cost: 0, sell: 4.68, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BSWIV-VERT-B.JPG' },
  { sku: 'SS-BV-MN', cost: 0, sell: 1.44, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-BV-B.JPG' },
  { sku: 'SS-DC-MN', cost: 0, sell: 4.91, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-DC-B.JPG' },
  { sku: 'SS-FTG-0975-MN', cost: 0, sell: 61.26, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTG-0975-B.JPG' },
  { sku: 'SS-FTG-0975-W', cost: 0, sell: 61.26, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTG-0975-B.JPG' },
  { sku: 'SS-FTP-2450-MN', cost: 0, sell: 78.94, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTP-2450-B.JPG' },
  { sku: 'SS-FTP-2450-W', cost: 0, sell: 78.94, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-FTP-2450-B.JPG' },
  { sku: 'SS-PLUG-D35-4PK-B', cost: 0, sell: 1.87, img: '' },
  { sku: 'SS-PLUG-D35-4PK-MN', cost: 0, sell: 1.87, img: '' },
  { sku: 'SS-PLUG-D35-4PK-W', cost: 0, sell: 1.87, img: '' },
  { sku: 'SS-POSTPLUG-4PK', cost: 0, sell: 1.56, img: '' },
  { sku: 'SS-POSTPLUG-4PK-MN', cost: 0, sell: 1.56, img: '' },
  { sku: 'SS-POSTPLUG-4PK-W', cost: 0, sell: 1.56, img: '' },
  { sku: 'SS-TC', cost: 0, sell: 0.68, img: '' },
  { sku: 'SS-TD', cost: 0, sell: 0.72, img: '' },
  { sku: 'SS-TD-EXT-W', cost: 0, sell: 0.62, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-TD-EXT-B.JPG' },
  { sku: 'SS-TS-100-B', cost: 0, sell: 9.76, img: '' },
  { sku: 'SS-TS-100-G', cost: 0, sell: 9.38, img: '' },
  { sku: 'SS-TS-100-MN', cost: 0, sell: 9.76, img: '' },
  { sku: 'SS-TS-100-S', cost: 0, sell: 9.76, img: '' },
  { sku: 'SS-TS-100-W', cost: 0, sell: 9.76, img: '' },
  { sku: 'XP-1800-FP-W', cost: 0, sell: 26.00, img: '' },
  { sku: 'XP-2400-FP-B', cost: 0, sell: 38.55, img: '' },
  { sku: 'XP-2400-FP-W', cost: 0, sell: 38.55, img: '' },
  { sku: 'XP-DR-G', cost: 0, sell: 2.35, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DR-B.JPG' },
  { sku: 'XP-DR-MN', cost: 0, sell: 2.35, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DR-B.JPG' },
  // Barr WHITE variants — using black variant fallback
  { sku: 'BR-PANEL-2205-1200-W', cost: 0, sell: 196.56, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-PANEL-2205-1200-B.JPG' },
  { sku: 'BR-GATE-0975-1200-W', cost: 0, sell: 129.90, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-GATE-0975-1200-B.JPG' },
  { sku: 'BR-1280-BP-W', cost: 0, sell: 31.10, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-1280-BP-B.JPG' },
  { sku: 'BR-1800-W', cost: 0, sell: 34.22, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-1800-B.JPG' },
  { sku: 'BR-BR25-W-4PK', cost: 0, sell: 8.53, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-BR25-B-4PK.JPG' },
  { sku: 'BR-DR-W', cost: 0, sell: 1.87, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-DR-B.JPG' },
  { sku: 'BR-DC-2P-W', cost: 0, sell: 4.11, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/BR-DC-2P-B.JPG' },
  // Balustrade — SUMMIT Frameless Balustrade glass panels (970mm high)
  { sku: '970NTG-0300', cost: 17.60, sell: 24.64, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0300.JPG' },
  { sku: '970NTG-0350', cost: 20.55, sell: 28.77, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0350.JPG' },
  { sku: '970NTG-0400', cost: 23.47, sell: 32.86, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0400.JPG' },
  { sku: '970NTG-0450', cost: 26.39, sell: 36.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0450.JPG' },
  { sku: '970NTG-0500', cost: 29.34, sell: 41.08, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0500.JPG' },
  { sku: '970NTG-0550', cost: 32.26, sell: 45.16, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0550.JPG' },
  { sku: '970NTG-0600', cost: 35.20, sell: 49.28, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0600.JPG' },
  { sku: '970NTG-0650', cost: 38.13, sell: 53.38, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0650.JPG' },
  { sku: '970NTG-0700', cost: 41.09, sell: 57.53, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0700.JPG' },
  { sku: '970NTG-0750', cost: 44.00, sell: 61.60, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0750.JPG' },
  { sku: '970NTG-0800', cost: 46.95, sell: 65.73, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0800.JPG' },
  { sku: '970NTG-0850', cost: 49.87, sell: 69.82, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0850.JPG' },
  { sku: '970NTG-0900', cost: 52.81, sell: 73.93, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0900.JPG' },
  { sku: '970NTG-0950', cost: 55.74, sell: 78.04, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-0950.JPG' },
  { sku: '970NTG-1000', cost: 58.67, sell: 82.14, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1000.JPG' },
  { sku: '970NTG-1050', cost: 61.61, sell: 86.25, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1050.JPG' },
  { sku: '970NTG-1100', cost: 64.52, sell: 90.33, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1100.JPG' },
  { sku: '970NTG-1150', cost: 67.47, sell: 94.46, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1150.JPG' },
  { sku: '970NTG-1200', cost: 70.40, sell: 98.56, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1200.JPG' },
  { sku: '970NTG-1250', cost: 73.35, sell: 102.69, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1250.JPG' },
  { sku: '970NTG-1300', cost: 76.26, sell: 106.76, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1300.JPG' },
  { sku: '970NTG-1350', cost: 79.21, sell: 110.89, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1350.JPG' },
  { sku: '970NTG-1400', cost: 82.13, sell: 114.98, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1400.JPG' },
  { sku: '970NTG-1450', cost: 85.07, sell: 119.10, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1450.JPG' },
  { sku: '970NTG-1500', cost: 88.02, sell: 123.23, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1500.JPG' },
  { sku: '970NTG-1550', cost: 90.94, sell: 127.32, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1550.JPG' },
  { sku: '970NTG-1600', cost: 93.87, sell: 131.42, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1600.JPG' },
  { sku: '970NTG-1650', cost: 96.81, sell: 135.53, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1650.JPG' },
  { sku: '970NTG-1700', cost: 99.74, sell: 139.64, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1700.JPG' },
  { sku: '970NTG-1750', cost: 102.67, sell: 143.74, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1750.JPG' },
  { sku: '970NTG-1800', cost: 105.61, sell: 147.85, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/970NTG-1800.JPG' },
  { sku: 'C970NTG-0300', cost: 18.72, sell: 26.21, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0300.JPG' },
  { sku: 'C970NTG-0350', cost: 21.86, sell: 30.60, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0350.JPG' },
  { sku: 'C970NTG-0400', cost: 24.98, sell: 34.97, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0400.JPG' },
  { sku: 'C970NTG-0450', cost: 28.08, sell: 39.31, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0450.JPG' },
  { sku: 'C970NTG-0500', cost: 31.22, sell: 43.71, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0500.JPG' },
  { sku: 'C970NTG-0550', cost: 34.33, sell: 48.06, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0550.JPG' },
  { sku: 'C970NTG-0600', cost: 37.46, sell: 52.44, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0600.JPG' },
  { sku: 'C970NTG-0650', cost: 40.57, sell: 56.80, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0650.JPG' },
  { sku: 'C970NTG-0700', cost: 43.72, sell: 61.21, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0700.JPG' },
  { sku: 'C970NTG-0750', cost: 46.82, sell: 65.55, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0750.JPG' },
  { sku: 'C970NTG-0800', cost: 49.94, sell: 69.92, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0800.JPG' },
  { sku: 'C970NTG-0850', cost: 53.06, sell: 74.28, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0850.JPG' },
  { sku: 'C970NTG-0900', cost: 56.19, sell: 78.67, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0900.JPG' },
  { sku: 'C970NTG-0950', cost: 59.30, sell: 83.02, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-0950.JPG' },
  { sku: 'C970NTG-1000', cost: 62.42, sell: 87.39, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1000.JPG' },
  { sku: 'C970NTG-1050', cost: 65.55, sell: 91.77, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1050.JPG' },
  { sku: 'C970NTG-1100', cost: 68.65, sell: 96.11, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1100.JPG' },
  { sku: 'C970NTG-1150', cost: 71.79, sell: 100.51, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1150.JPG' },
  { sku: 'C970NTG-1200', cost: 74.91, sell: 104.87, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1200.JPG' },
  { sku: 'C970NTG-1250', cost: 78.04, sell: 109.26, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1250.JPG' },
  { sku: 'C970NTG-1300', cost: 81.16, sell: 113.62, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1300.JPG' },
  { sku: 'C970NTG-1350', cost: 84.28, sell: 117.99, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1350.JPG' },
  { sku: 'C970NTG-1400', cost: 87.39, sell: 122.35, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1400.JPG' },
  { sku: 'C970NTG-1450', cost: 90.52, sell: 126.73, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1450.JPG' },
  { sku: 'C970NTG-1500', cost: 93.64, sell: 131.10, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1500.JPG' },
  { sku: 'C970NTG-1550', cost: 96.76, sell: 135.46, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1550.JPG' },
  { sku: 'C970NTG-1600', cost: 99.88, sell: 139.83, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1600.JPG' },
  { sku: 'C970NTG-1650', cost: 103.01, sell: 144.21, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1650.JPG' },
  { sku: 'C970NTG-1700', cost: 106.12, sell: 148.57, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1700.JPG' },
  { sku: 'C970NTG-1750', cost: 109.25, sell: 152.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1750.JPG' },
  { sku: 'C970NTG-1800', cost: 112.36, sell: 157.30, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/C970NTG-1800.JPG' },
  // Balustrade — MADRID base-plated spigots
  { sku: 'MAD-SBP-B', cost: 45.32, sell: 63.45, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-SBP-B.JPG' },
  { sku: 'MAD-SBP-MW', cost: 47.48, sell: 66.47, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-SBP-MW.JPG' },
  { sku: 'MAD-SBP-P', cost: 39.82, sell: 55.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-SBP-P.JPG' },
  { sku: 'MAD-SBP-S', cost: 39.82, sell: 55.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-SBP-S.JPG' },
  // Balustrade — MADRID domical cover plates
  { sku: 'MAD-SDC-B', cost: 5.79, sell: 8.11, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-SDC-B.JPG' },
  { sku: 'MAD-SDC-MW', cost: 6.90, sell: 9.66, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-SDC-MW.JPG' },
  { sku: 'MAD-SDC-P', cost: 4.67, sell: 6.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-SDC-P.JPG' },
  { sku: 'MAD-SDC-S', cost: 4.67, sell: 6.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/MAD-SDC-S.JPG' },
  // Balustrade — SUMMIT 25x21mm RHS handrail rail stock
  { sku: 'STG-R2900-2521-S', cost: 35.00, sell: 49.00, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-R2900-2521-S.JPG' },
  { sku: 'STG-R5800-2521-B', cost: 140.87, sell: 197.22, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-R5800-2521-B.JPG' },
  { sku: 'STG-R5800-2521-MW', cost: 162.16, sell: 227.02, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-R5800-2521-MW.JPG' },
  { sku: 'STG-R5800-2521-P', cost: 103.64, sell: 145.10, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-R5800-2521-P.JPG' },
  { sku: 'STG-R5800-2521-S', cost: 92.82, sell: 129.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-R5800-2521-S.JPG' },
  // Balustrade — SUMMIT 25x21mm handrail fittings (joiners, end caps, wall plates)
  { sku: 'STG-2521-90-VA-L-B', cost: 16.32, sell: 22.85, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90-VA-L-B.JPG' },
  { sku: 'STG-2521-90-VA-L-P', cost: 12.53, sell: 17.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90-VA-L-P.JPG' },
  { sku: 'STG-2521-90-VA-L-S', cost: 12.53, sell: 17.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90-VA-L-S.JPG' },
  { sku: 'STG-2521-90-VA-R-B', cost: 16.32, sell: 22.85, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90-VA-R-B.JPG' },
  { sku: 'STG-2521-90-VA-R-P', cost: 12.53, sell: 17.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90-VA-R-P.JPG' },
  { sku: 'STG-2521-90-VA-R-S', cost: 12.53, sell: 17.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90-VA-R-S.JPG' },
  { sku: 'STG-2521-90J-B', cost: 15.54, sell: 21.76, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90J-B.JPG' },
  { sku: 'STG-2521-90J-MW', cost: 16.33, sell: 22.86, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90J-MW.JPG' },
  { sku: 'STG-2521-90J-P', cost: 9.72, sell: 13.61, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90J-P.JPG' },
  { sku: 'STG-2521-90J-S', cost: 9.72, sell: 13.61, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-90J-S.JPG' },
  { sku: 'STG-2521-EC-B', cost: 5.36, sell: 7.50, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-EC-B.JPG' },
  { sku: 'STG-2521-EC-MW', cost: 5.36, sell: 7.50, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-EC-MW.JPG' },
  { sku: 'STG-2521-EC-P', cost: 4.26, sell: 5.96, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-EC-P.JPG' },
  { sku: 'STG-2521-EC-S', cost: 4.36, sell: 6.10, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-EC-S.JPG' },
  { sku: 'STG-2521-HJA-B', cost: 17.37, sell: 24.32, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-HJA-B.JPG' },
  { sku: 'STG-2521-HJA-MW', cost: 17.37, sell: 24.32, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-HJA-MW.JPG' },
  { sku: 'STG-2521-HJA-P', cost: 10.82, sell: 15.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-HJA-P.JPG' },
  { sku: 'STG-2521-HJA-S', cost: 10.82, sell: 15.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-HJA-S.JPG' },
  { sku: 'STG-2521-J-B', cost: 9.72, sell: 13.61, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-J-B.JPG' },
  { sku: 'STG-2521-J-MW', cost: 9.72, sell: 13.61, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-J-MW.JPG' },
  { sku: 'STG-2521-J-P', cost: 9.28, sell: 12.99, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-J-P.JPG' },
  { sku: 'STG-2521-J-S', cost: 9.28, sell: 12.99, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-J-S.JPG' },
  { sku: 'STG-2521-SC-P', cost: 8.31, sell: 11.63, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-SC-P.JPG' },
  { sku: 'STG-2521-SC-S', cost: 8.31, sell: 11.63, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-SC-S.JPG' },
  { sku: 'STG-2521-VERTJ-B', cost: 14.09, sell: 19.73, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-VERTJ-B.JPG' },
  { sku: 'STG-2521-VERTJ-P', cost: 10.82, sell: 15.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-VERTJ-P.JPG' },
  { sku: 'STG-2521-VERTJ-S', cost: 10.82, sell: 15.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-VERTJ-S.JPG' },
  { sku: 'STG-2521-VJA-B', cost: 15.29, sell: 21.41, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-VJA-B.JPG' },
  { sku: 'STG-2521-VJA-MW', cost: 15.29, sell: 21.41, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-VJA-MW.JPG' },
  { sku: 'STG-2521-VJA-P', cost: 10.82, sell: 15.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-VJA-P.JPG' },
  { sku: 'STG-2521-VJA-S', cost: 10.82, sell: 15.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-VJA-S.JPG' },
  { sku: 'STG-2521-WP-B', cost: 10.82, sell: 15.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-B.JPG' },
  { sku: 'STG-2521-WP-HA-L-B', cost: 12.53, sell: 17.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-HA-L-B.JPG' },
  { sku: 'STG-2521-WP-HA-L-P', cost: 11.25, sell: 15.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-HA-L-P.JPG' },
  { sku: 'STG-2521-WP-HA-L-S', cost: 11.25, sell: 15.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-HA-L-S.JPG' },
  { sku: 'STG-2521-WP-HA-R-B', cost: 12.53, sell: 17.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-HA-R-B.JPG' },
  { sku: 'STG-2521-WP-HA-R-P', cost: 11.25, sell: 15.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-HA-R-P.JPG' },
  { sku: 'STG-2521-WP-HA-R-S', cost: 11.25, sell: 15.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-HA-R-S.JPG' },
  { sku: 'STG-2521-WP-MW', cost: 10.82, sell: 15.15, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-MW.JPG' },
  { sku: 'STG-2521-WP-P', cost: 7.54, sell: 10.56, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-P.JPG' },
  { sku: 'STG-2521-WP-S', cost: 7.54, sell: 10.56, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-S.JPG' },
  { sku: 'STG-2521-WP-VA-L-B', cost: 12.53, sell: 17.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-VA-L-B.JPG' },
  { sku: 'STG-2521-WP-VA-L-P', cost: 11.25, sell: 15.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-VA-L-P.JPG' },
  { sku: 'STG-2521-WP-VA-L-S', cost: 11.25, sell: 15.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-VA-L-S.JPG' },
  { sku: 'STG-2521-WP-VA-R-B', cost: 12.53, sell: 17.54, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-VA-R-B.JPG' },
  { sku: 'STG-2521-WP-VA-R-P', cost: 11.25, sell: 15.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-VA-R-P.JPG' },
  { sku: 'STG-2521-WP-VA-R-S', cost: 11.25, sell: 15.75, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WP-VA-R-S.JPG' },
  { sku: 'STG-2521-WPEXT-B', cost: 11.91, sell: 16.67, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WPEXT-B.JPG' },
  { sku: 'STG-2521-WPEXT-MW', cost: 11.91, sell: 16.67, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WPEXT-MW.JPG' },
  { sku: 'STG-2521-WPEXT-P', cost: 9.72, sell: 13.61, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WPEXT-P.JPG' },
  { sku: 'STG-2521-WPEXT-S', cost: 9.72, sell: 13.61, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/STG-2521-WPEXT-S.JPG' },
  // RIO spigots + accessories (Round profile) — pulled from supplier 2026-04-15
  { sku: 'RIO-DR-MW', cost: 5.53, sell: 7.74, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-DR-MW.JPG' },
  { sku: 'RIO-DR-P', cost: 3.66, sell: 5.12, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-DR-P.JPG' },
  { sku: 'RIO-DR-S', cost: 3.66, sell: 5.12, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-DR-S.JPG' },
  { sku: 'RIO-HDC-MW', cost: 6.39, sell: 8.95, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-HDC-MW.JPG' },
  { sku: 'RIO-HDC-P', cost: 4.01, sell: 5.61, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-HDC-P.JPG' },
  { sku: 'RIO-HDC-S', cost: 4.01, sell: 5.61, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-HDC-S.JPG' },
  { sku: 'RIO-S-MW', cost: 54.69, sell: 76.57, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-S-MW.JPG' },
  { sku: 'RIO-S-P', cost: 42.35, sell: 59.29, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-S-P.JPG' },
  { sku: 'RIO-S-S', cost: 42.35, sell: 59.29, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-S-S.JPG' },
  { sku: 'RIO-SBP-MW', cost: 52.17, sell: 73.04, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-SBP-MW.JPG' },
  { sku: 'RIO-SBP-P', cost: 40.95, sell: 57.33, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-SBP-P.JPG' },
  { sku: 'RIO-SBP-S', cost: 40.95, sell: 57.33, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-SBP-S.JPG' },
  { sku: 'RIO-SDC-MW', cost: 6.33, sell: 8.86, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-SDC-MW.JPG' },
  { sku: 'RIO-SDC-P', cost: 3.47, sell: 4.86, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-SDC-P.JPG' },
  { sku: 'RIO-SDC-S', cost: 3.47, sell: 4.86, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/RIO-SDC-S.JPG' },

  // ── AIRE+ Horizontal Slat Balustrade ─────────────────────────────────────
  // Pricing from cost_price_master.csv in ef-air-materials-calculator-plugin-v1.0.4
  // All colour variants carry the same cost (just different powder coat).
  // Oval handrail (OHR) not in CSV — priced at 0 until confirmed with supplier.

  // Posts — Base Plate 1050mm H (AR-1050-FPBP: cost $33.18)
  { sku: 'AR-1050-FPBP-B',  cost: 33.18, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-1050-FPBP-B.JPG' },
  { sku: 'AR-1050-FPBP-MN', cost: 33.18, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-1050-FPBP-MN.JPG' },
  { sku: 'AR-1050-FPBP-W',  cost: 33.18, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-1050-FPBP-W.JPG' },
  { sku: 'AR-1050-FPBP-M',  cost: 33.18, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-1050-FPBP-M.JPG' },

  // Posts — Full Post 5800mm for Core Drill (not in CSV — cost TBC)
  { sku: 'AR-5800-FP-B',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-5800-FP-B.JPG' },
  { sku: 'AR-5800-FP-MN', cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-5800-FP-MN.JPG' },
  { sku: 'AR-5800-FP-W',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-5800-FP-W.JPG' },
  { sku: 'AR-5800-FP-M',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-5800-FP-M.JPG' },

  // Post covers — Domical 2-part (XP-DC-2P: cost $5.11)
  { sku: 'XP-DC-2P-B',  cost: 5.11, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DC-2P-B.JPG' },
  { sku: 'XP-DC-2P-MN', cost: 5.11, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DC-2P-MN.JPG' },
  { sku: 'XP-DC-2P-W',  cost: 5.11, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DC-2P-W.JPG' },
  { sku: 'XP-DC-2P-M',  cost: 5.11, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DC-2P-M.JPG' },

  // Post covers — Dress Ring (not in CSV — cost TBC)
  { sku: 'XP-DR-B',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DR-B.JPG' },
  { sku: 'XP-DR-MN', cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DR-MN.JPG' },
  { sku: 'XP-DR-W',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DR-W.JPG' },
  { sku: 'XP-DR-M',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-DR-M.JPG' },

  // Bottom Rail 5800mm (AR-BOTTOM-RAIL / AR-5800-BR: cost $105.05)
  { sku: 'AR-5800-BR-B',  cost: 105.05, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-5800-BR-B.JPG' },
  { sku: 'AR-5800-BR-MN', cost: 105.05, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-5800-BR-MN.JPG' },
  { sku: 'AR-5800-BR-W',  cost: 105.05, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-5800-BR-W.JPG' },
  { sku: 'AR-5800-BR-M',  cost: 105.05, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-5800-BR-M.JPG' },

  // Bottom Rail Insert 3022mm for 65mm slats (AR-3022-INS-65: cost $23.87)
  { sku: 'AR-3022-INS-65-B',  cost: 23.87, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-3022-INS-65-B.JPG' },
  { sku: 'AR-3022-INS-65-MN', cost: 23.87, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-3022-INS-65-MN.JPG' },
  { sku: 'AR-3022-INS-65-W',  cost: 23.87, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-3022-INS-65-W.JPG' },
  { sku: 'AR-3022-INS-65-M',  cost: 23.87, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-3022-INS-65-M.JPG' },

  // Slats 65×16.5mm, 6100mm stock (XP-6100-S65: cost $37.29)
  { sku: 'XP-6100-S65-B',  cost: 37.29, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-6100-S65-B.JPG' },
  { sku: 'XP-6100-S65-MN', cost: 37.29, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-6100-S65-MN.JPG' },
  { sku: 'XP-6100-S65-W',  cost: 37.29, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-6100-S65-W.JPG' },
  { sku: 'XP-6100-S65-M',  cost: 37.29, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-6100-S65-M.JPG' },

  // Handrail — Oval 5800mm (not in CSV — cost TBC)
  { sku: 'A50-5800-OHR-B',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-5800-OHR-B.JPG' },
  { sku: 'A50-5800-OHR-MN', cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-5800-OHR-MN.JPG' },
  { sku: 'A50-5800-OHR-W',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-5800-OHR-W.JPG' },
  { sku: 'A50-5800-OHR-M',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-5800-OHR-M.JPG' },

  // Handrail — Rectangular 5800mm (A50-5800-RHR: cost $97.72)
  { sku: 'A50-5800-RHR-B',  cost: 97.72, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-5800-RHR-B.JPG' },
  { sku: 'A50-5800-RHR-MN', cost: 97.72, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-5800-RHR-MN.JPG' },
  { sku: 'A50-5800-RHR-W',  cost: 97.72, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-5800-RHR-W.JPG' },
  { sku: 'A50-5800-RHR-M',  cost: 97.72, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-5800-RHR-M.JPG' },

  // Offset Brackets — Oval Handrail (2pk) — not in CSV, cost TBC
  { sku: 'A50-BRACKET-O-B-2PK',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-BRACKET-O-B-2PK.JPG' },
  { sku: 'A50-BRACKET-O-MN-2PK', cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-BRACKET-O-MN-2PK.JPG' },
  { sku: 'A50-BRACKET-O-W-2PK',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-BRACKET-O-W-2PK.JPG' },
  { sku: 'A50-BRACKET-O-M-2PK',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-BRACKET-O-M-2PK.JPG' },

  // Offset Brackets — Rectangular Handrail (2pk) (A50-BRACKET-R-2PK: cost $5.15)
  { sku: 'A50-BRACKET-R-B-2PK',  cost: 5.15, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-BRACKET-R-B-2PK.JPG' },
  { sku: 'A50-BRACKET-R-MN-2PK', cost: 5.15, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-BRACKET-R-MN-2PK.JPG' },
  { sku: 'A50-BRACKET-R-W-2PK',  cost: 5.15, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-BRACKET-R-W-2PK.JPG' },
  { sku: 'A50-BRACKET-R-M-2PK',  cost: 5.15, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-BRACKET-R-M-2PK.JPG' },

  // End Caps — Oval Handrail (not in CSV, cost TBC)
  { sku: 'A50-ECA-O-B',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-ECA-O-B.JPG' },
  { sku: 'A50-ECA-O-MN', cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-ECA-O-MN.JPG' },
  { sku: 'A50-ECA-O-W',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-ECA-O-W.JPG' },
  { sku: 'A50-ECA-O-M',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-ECA-O-M.JPG' },

  // End Caps — Rectangular Handrail (A50-ECA-R: cost $2.03)
  { sku: 'A50-ECA-R-B',  cost: 2.03, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-ECA-R-B.JPG' },
  { sku: 'A50-ECA-R-MN', cost: 2.03, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-ECA-R-MN.JPG' },
  { sku: 'A50-ECA-R-W',  cost: 2.03, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-ECA-R-W.JPG' },
  { sku: 'A50-ECA-R-M',  cost: 2.03, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-ECA-R-M.JPG' },

  // Top Spacers 65mm, pack of 20 (AR-SPACER-65MM: cost $5.93)
  { sku: 'AR-SPACER-65MM-B',  cost: 5.93, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-SPACER-65MM-B.JPG' },
  { sku: 'AR-SPACER-65MM-MN', cost: 5.93, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-SPACER-65MM-MN.JPG' },
  { sku: 'AR-SPACER-65MM-W',  cost: 5.93, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-SPACER-65MM-W.JPG' },
  { sku: 'AR-SPACER-65MM-M',  cost: 5.93, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-SPACER-65MM-M.JPG' },

  // Mounting Plates for Bottom Rail, pack of 2 (AR-PLATE-2PK: cost $4.11)
  { sku: 'AR-PLATE-B-2PK',  cost: 4.11, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-PLATE-B-2PK.JPG' },
  { sku: 'AR-PLATE-MN-2PK', cost: 4.11, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-PLATE-MN-2PK.JPG' },
  { sku: 'AR-PLATE-W-2PK',  cost: 4.11, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-PLATE-W-2PK.JPG' },
  { sku: 'AR-PLATE-M-2PK',  cost: 4.11, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-PLATE-M-2PK.JPG' },

  // 3-Rail Infill 1400mm (not in CSV — cost TBC)
  { sku: 'A50-1400-INF-B',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-1400-INF-B.JPG' },
  { sku: 'A50-1400-INF-MN', cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-1400-INF-MN.JPG' },
  { sku: 'A50-1400-INF-W',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-1400-INF-W.JPG' },
  { sku: 'A50-1400-INF-M',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-1400-INF-M.JPG' },

  // Bottom rail screws, 50pk (AR-SCR-BR-50PK: cost $3.85) — colour variants share same price
  { sku: 'AR-SCR-BR-50PK',    cost: 3.85, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-SCR-BR-50PK.JPG' },
  { sku: 'AR-SCR-BR-50PK-B',  cost: 3.85, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-SCR-BR-50PK-B.JPG' },
  { sku: 'AR-SCR-BR-50PK-MN', cost: 3.85, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-SCR-BR-50PK-MN.JPG' },
  { sku: 'AR-SCR-BR-50PK-W',  cost: 3.85, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-SCR-BR-50PK-W.JPG' },
  { sku: 'AR-SCR-BR-50PK-M',  cost: 3.85, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/AR-SCR-BR-50PK-M.JPG' },

  // Tek screws SS304 50pk (SS-TS-50-SS304: cost $4.68)
  { sku: 'SS-TS-50-SS304', cost: 4.68, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/SS-TS-50-SS304.JPG' },

  // CSK screws 12g×50, 50pk (CSK-12GX50-50PK: cost $5.62)
  { sku: 'CSK-12GX50-50PK', cost: 5.62, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/CSK-12GX50-50PK.JPG' },

  // XP Screws (not in CSV — cost TBC)
  { sku: 'XP-SCREWS-B',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-SCREWS-B.JPG' },
  { sku: 'XP-SCREWS-MN', cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-SCREWS-MN.JPG' },
  { sku: 'XP-SCREWS-W',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-SCREWS-W.JPG' },
  { sku: 'XP-SCREWS-M',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/XP-SCREWS-M.JPG' },

  // Wall plate (A50-WP — not in CSV)
  { sku: 'A50-WP-B',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-WP-B.JPG' },
  { sku: 'A50-WP-MN', cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-WP-MN.JPG' },
  { sku: 'A50-WP-W',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-WP-W.JPG' },
  { sku: 'A50-WP-M',  cost: 0, sell: 0, img: 'https://glassoutletonline.com.au/pictures/resized/250x250/A50-WP-M.JPG' },
];

/**
 * Build the cost lookup map: SKU (uppercased) -> { sell, cost, img }
 *
 * Client-facing pricing policy: every SKU with a known supplier cost is
 * shown at a uniform markup (MARKUP below). This keeps margins consistent
 * across families so the prices shown to prospects don't reveal internal
 * per-item margins. If cost is 0 (unknown), the explicit `sell` price from
 * the data is used as-is.
 *
 * Adjust MARKUP to change the site-wide margin (1.6 = 60%).
 */
const MARKUP = 1.6;

export function buildCostMap() {
  const map = {};
  RAW_COSTS.forEach(({ sku, cost, sell, img }) => {
    const key = sku.toUpperCase();
    const finalSell = cost > 0
      ? Math.round(cost * MARKUP * 100) / 100
      : sell;
    map[key] = {
      sell: Math.round(finalSell * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      img: img || '',
    };
  });
  return map;
}

/** Pre-built cost map for direct import */
export const COST_MAP = buildCostMap();
