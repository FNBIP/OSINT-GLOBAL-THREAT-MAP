import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PIPELINES_DATA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    // 1. Nord Stream 1 (Russia Vyborg → Germany Greifswald, Baltic Sea) - DAMAGED
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [28.73, 60.71], [27.80, 60.20], [24.50, 59.60], [21.00, 58.80],
          [18.50, 57.50], [16.00, 55.80], [14.50, 55.00], [13.40, 54.10],
        ],
      },
      properties: { name: "Nord Stream 1", type: "gas", length_km: 1224, capacity: "55 bcm/year", operator: "Nord Stream AG", status: "damaged" },
    },
    // 2. Nord Stream 2 (Russia → Germany, parallel route) - DAMAGED
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [28.60, 60.68], [27.50, 60.10], [24.30, 59.50], [20.80, 58.60],
          [18.30, 57.30], [15.80, 55.70], [14.30, 54.90], [13.45, 54.08],
        ],
      },
      properties: { name: "Nord Stream 2", type: "gas", length_km: 1234, capacity: "55 bcm/year", operator: "Nord Stream 2 AG", status: "damaged" },
    },
    // 3. TurkStream (Russia → Turkey, Black Sea)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [38.95, 44.60], [37.50, 43.80], [35.50, 43.00], [33.00, 42.50],
          [31.50, 42.00], [30.50, 41.70], [29.60, 41.40], [28.95, 41.05],
        ],
      },
      properties: { name: "TurkStream", type: "gas", length_km: 930, capacity: "31.5 bcm/year", operator: "South Stream Transport B.V.", status: "active" },
    },
    // 4. Druzhba Pipeline (Russia → Germany/Poland via Belarus/Ukraine)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [52.00, 54.80], [49.10, 53.20], [43.50, 52.50], [38.00, 53.00],
          [30.35, 53.90], [27.55, 53.90], [23.80, 53.70], [21.00, 52.25],
          [16.90, 52.40], [14.55, 52.35],
        ],
      },
      properties: { name: "Druzhba Pipeline", type: "oil", length_km: 5500, capacity: "1.2M bbl/day", operator: "Transneft", status: "active" },
    },
    // 5. BTC Pipeline (Baku → Tbilisi → Ceyhan)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [49.87, 40.41], [48.50, 40.70], [47.00, 41.00], [45.50, 41.50],
          [44.80, 41.70], [43.50, 41.40], [42.00, 40.50], [40.00, 39.50],
          [38.00, 38.50], [36.50, 37.50], [35.95, 36.95],
        ],
      },
      properties: { name: "BTC Pipeline (Baku-Tbilisi-Ceyhan)", type: "oil", length_km: 1768, capacity: "1.2M bbl/day", operator: "BP", status: "active" },
    },
    // 6. TANAP (Trans-Anatolian, Turkey east to west)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [43.10, 41.10], [41.50, 40.30], [39.50, 39.70], [37.50, 39.00],
          [35.50, 38.50], [33.00, 38.80], [31.00, 39.50], [29.00, 40.00],
          [27.50, 40.50],
        ],
      },
      properties: { name: "TANAP (Trans-Anatolian Pipeline)", type: "gas", length_km: 1850, capacity: "16 bcm/year", operator: "TANAP Dogalgaz", status: "active" },
    },
    // 7. TAP (Trans-Adriatic, Greece/Albania/Italy)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [26.50, 41.10], [24.50, 40.80], [22.50, 40.60], [21.00, 40.50],
          [20.30, 40.60], [19.80, 40.80], [19.45, 40.47], [18.80, 40.20],
          [18.50, 40.50],
        ],
      },
      properties: { name: "TAP (Trans-Adriatic Pipeline)", type: "gas", length_km: 878, capacity: "10 bcm/year", operator: "TAP AG", status: "active" },
    },
    // 8. Keystone Pipeline (Alberta Canada → Texas US)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-110.68, 53.55], [-108.50, 51.00], [-105.00, 49.00], [-101.50, 47.00],
          [-97.50, 44.50], [-96.70, 42.50], [-97.00, 39.50], [-97.30, 36.70],
          [-97.50, 34.50], [-97.00, 32.80], [-96.00, 30.50], [-95.50, 29.50],
        ],
      },
      properties: { name: "Keystone Pipeline", type: "oil", length_km: 3462, capacity: "830K bbl/day", operator: "TC Energy", status: "active" },
    },
    // 9. Colonial Pipeline (Houston TX → New York)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-95.36, 29.76], [-93.75, 30.22], [-91.15, 30.45], [-89.10, 30.70],
          [-87.70, 30.70], [-86.80, 33.52], [-84.39, 33.75], [-82.40, 34.85],
          [-80.84, 35.23], [-79.00, 36.10], [-77.44, 37.54], [-77.04, 38.90],
          [-74.17, 40.73],
        ],
      },
      properties: { name: "Colonial Pipeline", type: "oil", length_km: 8851, capacity: "2.5M bbl/day", operator: "Colonial Pipeline Company", status: "active" },
    },
    // 10. Dakota Access Pipeline (North Dakota → Illinois)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-103.60, 47.80], [-101.50, 47.00], [-100.80, 46.10], [-100.40, 45.50],
          [-99.50, 44.50], [-98.00, 43.50], [-97.00, 42.50], [-96.00, 41.50],
          [-94.50, 41.00], [-92.00, 40.50], [-90.10, 40.05],
        ],
      },
      properties: { name: "Dakota Access Pipeline (DAPL)", type: "oil", length_km: 1886, capacity: "750K bbl/day", operator: "Energy Transfer Partners", status: "active" },
    },
    // 11. Trans-Alaska Pipeline (Prudhoe Bay → Valdez)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-148.33, 70.25], [-149.00, 68.80], [-149.50, 68.00], [-149.80, 66.50],
          [-148.50, 64.85], [-146.50, 63.50], [-145.50, 62.80], [-146.00, 62.00],
          [-146.00, 61.30], [-146.35, 61.13],
        ],
      },
      properties: { name: "Trans-Alaska Pipeline (TAPS)", type: "oil", length_km: 1288, capacity: "2.1M bbl/day", operator: "Alyeska Pipeline Service Company", status: "active" },
    },
    // 12. Yamal-Europe Pipeline (Russia → Germany via Belarus/Poland)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [67.50, 66.50], [60.00, 61.00], [52.00, 57.00], [44.00, 55.00],
          [37.60, 55.75], [32.00, 54.80], [27.55, 53.90], [23.80, 53.10],
          [21.00, 52.25], [17.00, 52.40], [14.50, 52.35],
        ],
      },
      properties: { name: "Yamal-Europe Pipeline", type: "gas", length_km: 4107, capacity: "33 bcm/year", operator: "Gazprom / EuRoPol GAZ", status: "active" },
    },
    // 13. Blue Stream (Russia → Turkey via Black Sea)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [40.50, 44.70], [39.50, 44.00], [38.00, 43.50], [37.00, 42.80],
          [36.50, 42.30], [36.20, 41.80], [36.33, 41.29], [35.00, 40.50],
          [33.00, 39.90],
        ],
      },
      properties: { name: "Blue Stream", type: "gas", length_km: 1213, capacity: "16 bcm/year", operator: "Gazprom / ENI", status: "active" },
    },
    // 14. Trans-Mediterranean Pipeline (Algeria → Italy via Tunisia)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [2.90, 33.80], [4.00, 35.00], [6.50, 36.20], [8.30, 36.80],
          [9.20, 36.90], [10.50, 37.20], [11.50, 37.00], [12.50, 37.50],
          [13.50, 38.10], [15.50, 38.20], [16.50, 39.00],
        ],
      },
      properties: { name: "Trans-Mediterranean Pipeline (TransMed)", type: "gas", length_km: 2475, capacity: "33.5 bcm/year", operator: "Sonatrach / ENI", status: "active" },
    },
    // 15. Medgaz (Algeria → Spain)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [2.90, 33.80], [1.50, 35.00], [-0.30, 35.30], [-1.00, 36.00],
          [-1.50, 36.40], [-1.90, 36.70], [-2.47, 36.84],
        ],
      },
      properties: { name: "Medgaz", type: "gas", length_km: 757, capacity: "10 bcm/year", operator: "Medgaz S.A.", status: "active" },
    },
    // 16. Greenstream (Libya → Italy)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [12.50, 32.90], [12.00, 33.50], [12.00, 34.50], [12.20, 35.50],
          [12.50, 36.50], [12.60, 37.60],
        ],
      },
      properties: { name: "Greenstream", type: "gas", length_km: 540, capacity: "11 bcm/year", operator: "ENI / NOC Libya", status: "active" },
    },
    // 17. ESPO (East Siberia → Pacific Ocean / China)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [105.30, 56.85], [108.00, 54.00], [113.00, 52.00], [120.00, 50.00],
          [127.00, 49.00], [130.50, 48.50], [133.00, 47.50], [134.50, 46.00],
          [132.90, 42.90],
        ],
      },
      properties: { name: "ESPO Pipeline (Eastern Siberia-Pacific Ocean)", type: "oil", length_km: 4857, capacity: "1.6M bbl/day", operator: "Transneft", status: "active" },
    },
    // 18. Power of Siberia (Russia → China via Yakutia)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [114.00, 62.00], [118.00, 60.00], [122.00, 58.00], [126.00, 55.50],
          [128.50, 53.00], [130.00, 50.50], [131.00, 49.50], [127.60, 45.75],
        ],
      },
      properties: { name: "Power of Siberia", type: "gas", length_km: 3000, capacity: "38 bcm/year", operator: "Gazprom / CNPC", status: "active" },
    },
    // 19. Central Asia-China Pipeline (Turkmenistan → China)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [58.38, 38.97], [60.50, 39.50], [62.00, 40.50], [64.50, 41.00],
          [66.95, 39.65], [69.00, 41.30], [71.00, 41.00], [73.00, 42.50],
          [76.00, 43.25], [80.00, 44.00], [84.00, 43.80], [87.60, 43.80],
        ],
      },
      properties: { name: "Central Asia-China Gas Pipeline", type: "gas", length_km: 7000, capacity: "55 bcm/year", operator: "CNPC / Turkmengaz / KazMunayGas", status: "active" },
    },
    // 20. East-West Pipeline (Saudi Arabia, coast to coast)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [49.90, 26.50], [48.50, 26.30], [46.70, 25.50], [44.50, 24.50],
          [42.50, 23.80], [40.50, 23.50], [39.20, 22.50], [38.96, 21.44],
        ],
      },
      properties: { name: "East-West Pipeline (Petroline)", type: "oil", length_km: 1200, capacity: "5M bbl/day", operator: "Saudi Aramco", status: "active" },
    },
    // 21. Kirkuk-Ceyhan Pipeline (Iraq → Turkey)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [44.39, 35.47], [44.00, 36.00], [43.50, 36.50], [43.00, 37.00],
          [42.50, 37.30], [41.00, 37.50], [39.50, 37.40], [37.50, 37.10],
          [36.00, 37.00], [35.95, 36.95],
        ],
      },
      properties: { name: "Kirkuk-Ceyhan Pipeline", type: "oil", length_km: 970, capacity: "1.6M bbl/day", operator: "BOTAS / Iraqi Ministry of Oil", status: "active" },
    },
    // 22. TAPI Pipeline (Turkmenistan → India) - PLANNED
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [58.38, 38.97], [62.17, 37.60], [63.50, 36.50], [65.72, 35.95],
          [67.10, 34.52], [66.90, 31.60], [66.50, 30.40], [67.00, 29.50],
          [68.35, 27.50], [69.00, 25.40], [71.00, 24.00],
        ],
      },
      properties: { name: "TAPI Pipeline", type: "gas", length_km: 1814, capacity: "33 bcm/year", operator: "TAPI Pipeline Company Ltd", status: "planned" },
    },
    // 23. EastMed Pipeline (Israel/Cyprus → Greece) - PLANNED
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [34.50, 32.00], [33.70, 33.00], [33.00, 34.00], [32.50, 34.70],
          [31.00, 35.00], [29.00, 35.50], [27.00, 36.00], [25.50, 36.50],
          [24.00, 37.00], [23.00, 37.50], [21.50, 38.00],
        ],
      },
      properties: { name: "EastMed Pipeline", type: "gas", length_km: 1900, capacity: "10 bcm/year", operator: "IGI Poseidon (proposed)", status: "planned" },
    },
    // 24. Nigeria-Morocco Gas Pipeline (West Africa coast) - PLANNED
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [3.40, 6.45], [2.60, 6.40], [1.23, 6.13], [-0.19, 5.56],
          [-4.02, 5.30], [-7.00, 5.00], [-13.70, 9.50], [-15.60, 11.85],
          [-16.58, 13.45], [-17.45, 14.72], [-15.95, 18.09], [-13.20, 22.00],
          [-9.80, 30.00], [-7.60, 33.60],
        ],
      },
      properties: { name: "Nigeria-Morocco Gas Pipeline (NMGP)", type: "gas", length_km: 5660, capacity: "30 bcm/year", operator: "NNPC / ONHYM (proposed)", status: "planned" },
    },
    // 25. Trans-Saharan Pipeline (Nigeria → Algeria) - PLANNED
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [6.45, 5.60], [7.49, 9.06], [7.50, 11.00], [8.00, 13.50],
          [8.50, 15.50], [8.00, 17.50], [7.50, 19.50], [6.50, 22.00],
          [5.50, 25.00], [3.50, 28.00], [2.90, 33.80],
        ],
      },
      properties: { name: "Trans-Saharan Gas Pipeline (TSGP)", type: "gas", length_km: 4128, capacity: "30 bcm/year", operator: "NNPC / Sonatrach (proposed)", status: "planned" },
    },
  ],
};

export async function GET() {
  return NextResponse.json(PIPELINES_DATA);
}
