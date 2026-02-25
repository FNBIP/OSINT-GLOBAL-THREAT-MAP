import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CABLES_DATA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    // 1. TAT-14 (US East Coast → UK/France/Germany/Denmark/Netherlands)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.00, 40.45], [-65.00, 42.50], [-50.00, 47.00], [-35.00, 50.00],
          [-20.00, 51.50], [-10.00, 51.80], [-5.20, 50.30], [-1.80, 50.80],
          [1.50, 52.00], [3.50, 53.00], [7.00, 54.00], [9.50, 55.50],
        ],
      },
      properties: { name: "TAT-14", length_km: 15428, landing_points: "Manasquan NJ, Blaabjerg DK, Norden DE, Katwijk NL, St Valery FR, Bude UK", rfs_year: 2001, owners: "TAT-14 Consortium", capacity: "3.2 Tbps", status: "decommissioned" },
    },
    // 2. MAREA (Virginia Beach → Bilbao, Spain)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-75.97, 36.85], [-70.00, 38.00], [-55.00, 40.00], [-40.00, 41.50],
          [-25.00, 42.50], [-15.00, 43.20], [-8.00, 43.50], [-2.93, 43.26],
        ],
      },
      properties: { name: "MAREA", length_km: 6605, landing_points: "Virginia Beach US, Bilbao ES", rfs_year: 2018, owners: "Microsoft / Facebook / Telxius", capacity: "200 Tbps", status: "active" },
    },
    // 3. FASTER (Oregon → Japan)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-124.10, 43.40], [-135.00, 45.00], [-150.00, 47.00], [-165.00, 48.00],
          [-180.00, 47.50], [175.00, 46.00], [165.00, 43.00], [155.00, 40.00],
          [145.00, 37.00], [140.50, 35.50], [139.75, 35.30],
        ],
      },
      properties: { name: "FASTER", length_km: 11629, landing_points: "Bandon OR US, Chikura JP, Shima JP", rfs_year: 2016, owners: "Google / China Mobile / KDDI / SingTel / others", capacity: "60 Tbps", status: "active" },
    },
    // 4. SEA-ME-WE 3 (SE Asia → Middle East → W. Europe) — aging system with multiple historical cuts
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [103.80, 1.30], [98.00, 4.00], [88.00, 8.00], [80.00, 7.50],
          [73.00, 8.00], [65.00, 13.00], [58.00, 17.00], [52.00, 20.00],
          [44.00, 14.00], [42.50, 13.00], [38.00, 15.00], [34.50, 28.00],
          [32.30, 31.25], [28.00, 33.00], [20.00, 35.00], [10.00, 37.50],
          [3.00, 39.00], [-2.00, 40.00], [-5.00, 43.00], [-3.50, 48.50],
        ],
      },
      properties: { name: "SEA-ME-WE 3", length_km: 39000, landing_points: "33 landing points across SE Asia, Middle East, W. Europe", rfs_year: 1999, owners: "SEA-ME-WE 3 Consortium", capacity: "480 Gbps", status: "degraded" },
    },
    // 5. SEA-ME-WE 5 (Singapore → France)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [103.85, 1.29], [100.50, 3.00], [95.00, 6.00], [85.00, 8.00],
          [76.50, 8.90], [72.80, 10.00], [65.00, 14.00], [56.00, 18.00],
          [48.00, 15.00], [43.00, 13.50], [35.00, 27.50], [32.30, 31.25],
          [25.00, 34.00], [15.00, 37.00], [8.00, 39.50], [3.50, 43.30],
        ],
      },
      properties: { name: "SEA-ME-WE 5", length_km: 20000, landing_points: "Singapore, Sri Lanka, Djibouti, Saudi Arabia, Egypt, Italy, France + more", rfs_year: 2017, owners: "SEA-ME-WE 5 Consortium", capacity: "24 Tbps", status: "active" },
    },
    // 6. FLAG Europe-Asia (UK → Japan via Med/Red Sea/Indian Ocean) — Red Sea segment damaged by Houthi anchoring 2024
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-5.05, 50.20], [-3.00, 47.00], [-1.50, 43.50], [3.00, 39.50],
          [10.00, 36.50], [20.00, 34.00], [28.00, 33.00], [32.30, 31.25],
          [34.00, 28.00], [38.50, 18.00], [44.00, 12.50], [52.00, 17.00],
          [60.00, 20.00], [66.50, 22.00], [72.80, 10.00], [80.00, 7.50],
          [98.00, 4.00], [103.80, 1.30], [114.00, 5.00], [120.00, 14.50],
          [140.00, 35.00],
        ],
      },
      properties: { name: "FLAG Europe-Asia (FEA)", length_km: 28000, landing_points: "UK, Spain, Italy, Egypt, UAE, India, Malaysia, HK, Japan + more", rfs_year: 1997, owners: "Global Cloud Xchange", capacity: "10 Tbps", status: "damaged" },
    },
    // 7. Apollo (US → UK/France)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.80, 40.60], [-65.00, 42.00], [-50.00, 46.00], [-35.00, 49.00],
          [-20.00, 50.50], [-10.00, 50.50], [-5.20, 50.30],
        ],
      },
      properties: { name: "Apollo", length_km: 12874, landing_points: "Manasquan NJ US, Bude UK, Lannion FR", rfs_year: 2003, owners: "Apollo Submarine Cable / Vodafone", capacity: "3.2 Tbps", status: "active" },
    },
    // 8. AEConnect-1 (US → Ireland)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.80, 40.60], [-60.00, 44.00], [-45.00, 48.00], [-30.00, 51.00],
          [-18.00, 52.00], [-10.00, 51.80],
        ],
      },
      properties: { name: "AEConnect-1", length_km: 5536, landing_points: "Shirley NY US, Killala IE", rfs_year: 2016, owners: "Aqua Comms", capacity: "52 Tbps", status: "active" },
    },
    // 9. Hibernia Express (US → UK)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.80, 40.60], [-62.00, 43.50], [-48.00, 48.00], [-32.00, 51.00],
          [-18.00, 52.50], [-10.00, 52.00], [-5.80, 51.00],
        ],
      },
      properties: { name: "Hibernia Express", length_km: 4600, landing_points: "Halifax NS CA, Brean UK", rfs_year: 2015, owners: "GTT Communications", capacity: "53 Tbps", status: "active" },
    },
    // 10. PEACE (Pakistan → France via Egypt/Kenya)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [66.98, 24.87], [60.00, 22.00], [52.00, 18.00], [48.00, 13.00],
          [44.00, 11.50], [45.00, 5.00], [43.00, -1.00], [40.00, -4.10],
          [44.00, 12.00], [38.00, 16.00], [34.50, 28.00], [32.30, 31.25],
          [25.00, 34.00], [15.00, 37.50], [5.00, 41.50], [3.30, 43.20],
        ],
      },
      properties: { name: "PEACE Cable", length_km: 15000, landing_points: "Rawalpindi PK, Djibouti, Mombasa KE, Suez/Zafarana EG, Marseille FR", rfs_year: 2022, owners: "PEACE Cable International", capacity: "96 Tbps", status: "active" },
    },
    // 11. 2Africa (circumnavigating Africa)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-6.30, 34.50], [-9.00, 30.00], [-15.00, 22.00], [-17.50, 14.70],
          [-17.00, 10.00], [-8.00, 5.00], [3.40, 6.45], [8.00, 4.00],
          [12.00, -4.30], [13.00, -8.80], [13.50, -22.50], [18.50, -34.00],
          [25.70, -33.90], [32.00, -29.00], [35.00, -23.00], [40.00, -12.00],
          [45.00, -7.00], [49.00, -12.00], [44.00, -1.00], [44.00, 11.50],
          [48.00, 13.00], [56.30, 22.50], [50.00, 26.30], [34.50, 28.00],
          [32.30, 31.25], [25.00, 34.00], [15.00, 37.50], [5.00, 41.00],
          [1.50, 41.30],
        ],
      },
      properties: { name: "2Africa", length_km: 45000, landing_points: "46 landing points across Africa, Middle East, Europe", rfs_year: 2024, owners: "Meta / MTN / Vodafone / China Mobile / Orange + more", capacity: "180 Tbps", status: "active" },
    },
    // 12. Equiano (Portugal → South Africa)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-9.14, 38.72], [-12.00, 32.00], [-17.00, 22.00], [-17.50, 14.70],
          [-8.00, 5.00], [3.40, 6.45], [8.00, 4.00], [9.30, 1.00],
          [12.00, -4.30], [13.00, -15.00], [14.00, -22.50], [18.40, -33.90],
        ],
      },
      properties: { name: "Equiano", length_km: 15000, landing_points: "Lisbon PT, Lagos NG, Swakopmund NA, Cape Town ZA + more", rfs_year: 2023, owners: "Google", capacity: "144 Tbps", status: "active" },
    },
    // 13. EllaLink (Portugal/Spain → Brazil)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-9.14, 38.72], [-12.00, 34.00], [-18.00, 28.00], [-25.00, 20.00],
          [-32.00, 10.00], [-35.00, 2.00], [-34.87, -7.12],
        ],
      },
      properties: { name: "EllaLink", length_km: 10000, landing_points: "Sines PT, Madrid ES, Fortaleza BR, Sao Paulo BR", rfs_year: 2021, owners: "EllaLink / Marguerite Fund", capacity: "100 Tbps", status: "active" },
    },
    // 14. BRUSA (US → Brazil)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-75.97, 36.85], [-72.00, 32.00], [-65.00, 22.00], [-58.00, 12.00],
          [-50.00, 2.00], [-43.17, -22.91],
        ],
      },
      properties: { name: "BRUSA", length_km: 10556, landing_points: "Virginia Beach US, Fortaleza BR, Rio de Janeiro BR", rfs_year: 2018, owners: "Telxius", capacity: "138 Tbps", status: "active" },
    },
    // 15. SAex1 (South Africa → Malaysia)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [28.20, -25.75], [32.00, -29.00], [40.00, -15.00], [46.00, -5.00],
          [53.00, 0.00], [65.00, 8.00], [76.50, 8.90], [85.00, 6.00],
          [95.00, 3.00], [101.70, 3.10],
        ],
      },
      properties: { name: "SAex1 (South Africa Far East)", length_km: 13000, landing_points: "Mtunzini ZA, Maputo MZ, Dar es Salaam TZ, Melkbosstrand ZA, Penang MY", rfs_year: 2018, owners: "Openserve / others", capacity: "12.8 Tbps", status: "active" },
    },
    // 16. AAE-1 (SE Asia → Europe via Egypt) — Red Sea segment damaged 2024
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [114.00, 22.30], [110.00, 16.00], [104.00, 10.00], [103.80, 1.30],
          [95.00, 6.00], [80.00, 7.50], [72.80, 10.00], [56.00, 18.00],
          [44.00, 12.50], [38.00, 16.00], [34.50, 28.00], [32.30, 31.25],
          [25.00, 35.00], [14.00, 37.50], [5.00, 43.30],
        ],
      },
      properties: { name: "AAE-1 (Asia-Africa-Europe 1)", length_km: 25000, landing_points: "HK, Vietnam, Cambodia, Malaysia, Singapore, India, Oman, Djibouti, Egypt, Greece, Italy, France", rfs_year: 2017, owners: "AAE-1 Consortium", capacity: "40 Tbps", status: "damaged" },
    },
    // 17. PLCN (Pacific Light Cable Network, US → Philippines — originally to HK, rerouted)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-118.20, 33.80], [-130.00, 30.00], [-150.00, 28.00], [-170.00, 26.00],
          [180.00, 24.00], [160.00, 22.00], [140.00, 20.00], [121.50, 16.50],
        ],
      },
      properties: { name: "PLCN (Pacific Light Cable Network)", length_km: 12800, landing_points: "El Segundo CA US, Luzon PH", rfs_year: 2023, owners: "Google / Facebook", capacity: "144 Tbps", status: "active" },
    },
    // 18. Curie (US → Chile)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-118.20, 33.80], [-115.00, 28.00], [-108.00, 20.00], [-100.00, 10.00],
          [-92.00, 0.00], [-84.00, -8.00], [-78.00, -18.00], [-71.63, -33.04],
        ],
      },
      properties: { name: "Curie", length_km: 10476, landing_points: "Los Angeles US, Valparaiso CL", rfs_year: 2019, owners: "Google", capacity: "72 Tbps", status: "active" },
    },
    // 19. Junior (Brazil → US via Puerto Rico)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-43.17, -22.91], [-45.00, -15.00], [-50.00, -5.00], [-55.00, 5.00],
          [-60.00, 12.00], [-66.00, 18.00], [-67.00, 18.47],
          [-75.00, 25.50], [-80.00, 28.00],
        ],
      },
      properties: { name: "Junior", length_km: 7500, landing_points: "Rio de Janeiro BR, Fortaleza BR, San Juan PR, Jacksonville US", rfs_year: 2020, owners: "GlobeNet / Lumen", capacity: "100 Tbps", status: "active" },
    },
    // 20. Dunant (US → France)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-75.97, 36.85], [-65.00, 40.00], [-50.00, 44.00], [-35.00, 46.50],
          [-20.00, 48.00], [-10.00, 48.20], [-4.00, 47.80], [-2.50, 48.00],
        ],
      },
      properties: { name: "Dunant", length_km: 6400, landing_points: "Virginia Beach US, Saint-Hilaire-de-Riez FR", rfs_year: 2020, owners: "Google", capacity: "250 Tbps", status: "active" },
    },
    // 21. Grace Hopper (US → UK/Spain)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.80, 40.60], [-60.00, 42.50], [-45.00, 46.00], [-30.00, 49.00],
          [-15.00, 51.00], [-5.20, 50.30],
          [-15.00, 48.00], [-10.00, 44.50], [-3.00, 43.30],
        ],
      },
      properties: { name: "Grace Hopper", length_km: 6234, landing_points: "New York US, Bude UK, Bilbao ES", rfs_year: 2022, owners: "Google", capacity: "340 Tbps", status: "active" },
    },
    // 22. Havfrue/AEC-2 (US → Denmark/Norway/Ireland)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-73.80, 40.60], [-55.00, 46.00], [-35.00, 52.00], [-20.00, 55.00],
          [-10.00, 56.00], [-5.00, 57.00], [0.00, 57.50], [5.00, 57.00],
          [8.00, 56.50], [9.50, 55.50],
        ],
      },
      properties: { name: "Havfrue/AEC-2", length_km: 7860, landing_points: "Wall NJ US, Blaabjerg DK, Kristiansand NO, Killala IE", rfs_year: 2020, owners: "Google / Aqua Comms / Bulk Infrastructure", capacity: "108 Tbps", status: "active" },
    },
    // 23. Japan-US Cable Network
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.40, 37.80], [-135.00, 40.00], [-150.00, 42.00], [-165.00, 43.00],
          [-180.00, 42.50], [175.00, 41.00], [165.00, 39.00], [155.00, 37.00],
          [145.00, 35.50], [140.00, 35.00],
        ],
      },
      properties: { name: "Japan-US Cable Network (JUS)", length_km: 21000, landing_points: "San Francisco US, Los Angeles US, Shima JP, Maruyama JP", rfs_year: 2001, owners: "JUS Partners", capacity: "7.68 Tbps", status: "active" },
    },
    // 24. Southern Cross Cable (US → Australia/NZ/Fiji)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-118.20, 33.80], [-140.00, 20.00], [-155.00, 14.00], [-170.00, 5.00],
          [-178.00, -12.00], [178.00, -18.00], [175.00, -25.00],
          [172.00, -35.00], [174.77, -41.29],
          [178.00, -18.00], [165.00, -22.00], [155.00, -28.00],
          [151.21, -33.87],
        ],
      },
      properties: { name: "Southern Cross Cable (SCCN)", length_km: 30500, landing_points: "Los Angeles US, Suva FJ, Auckland NZ, Sydney AU", rfs_year: 2000, owners: "Southern Cross Cables Ltd / Spark / Verizon / Telstra", capacity: "22 Tbps", status: "active" },
    },
    // 25. TGN-Pacific (US → Japan)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-124.00, 44.00], [-140.00, 44.00], [-160.00, 44.00], [-180.00, 43.00],
          [170.00, 41.00], [155.00, 38.00], [140.00, 35.60],
        ],
      },
      properties: { name: "TGN-Pacific", length_km: 10000, landing_points: "Nedonna Beach OR US, Shima JP", rfs_year: 2002, owners: "Telia Carrier", capacity: "7.68 Tbps", status: "active" },
    },
    // 26. Unity (US → Japan)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-118.20, 33.80], [-135.00, 35.00], [-155.00, 33.00], [-170.00, 31.00],
          [180.00, 30.00], [165.00, 30.50], [150.00, 32.00], [140.00, 34.50],
        ],
      },
      properties: { name: "Unity", length_km: 10000, landing_points: "Redondo Beach CA US, Chikura JP", rfs_year: 2010, owners: "Google / KDDI / Bharti Airtel + others", capacity: "7.68 Tbps", status: "active" },
    },
    // 27. AJC (Australia → Japan via Guam)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [151.21, -33.87], [153.00, -28.00], [155.00, -20.00], [158.00, -10.00],
          [160.00, -2.00], [152.00, 5.00], [145.00, 10.00], [144.80, 13.44],
          [140.00, 20.00], [137.00, 28.00], [135.00, 33.50], [133.50, 34.40],
        ],
      },
      properties: { name: "AJC (Australia-Japan Cable)", length_km: 12700, landing_points: "Sydney AU, Guam, Maruyama JP", rfs_year: 2001, owners: "Telstra / NTT / KDD + others", capacity: "4.8 Tbps", status: "active" },
    },
    // 28. EAC-C2C (Singapore → Japan)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [103.80, 1.30], [106.00, 5.00], [109.00, 8.00], [112.00, 12.00],
          [114.00, 15.00], [117.00, 18.00], [119.00, 22.00], [121.50, 25.00],
          [124.00, 28.00], [128.00, 31.00], [132.00, 33.00], [135.00, 35.00],
        ],
      },
      properties: { name: "EAC-C2C", length_km: 7800, landing_points: "Singapore, Philippines, HK, Taiwan, Korea, Japan", rfs_year: 2002, owners: "EAC Pacific Consortium", capacity: "17.92 Tbps", status: "active" },
    },
    // 29. MainOne (Portugal → Nigeria)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-9.14, 38.72], [-12.00, 33.00], [-16.00, 26.00], [-17.50, 14.70],
          [-13.00, 8.00], [-5.00, 5.50], [2.10, 6.30], [3.40, 6.45],
        ],
      },
      properties: { name: "MainOne", length_km: 7000, landing_points: "Seixal PT, Accra GH, Lagos NG", rfs_year: 2010, owners: "MainOne (Equinix)", capacity: "10 Tbps", status: "active" },
    },
    // 30. WACS (UK → South Africa via West Africa)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-5.20, 50.30], [-7.00, 46.00], [-9.00, 40.00], [-9.14, 38.72],
          [-13.00, 30.00], [-16.50, 20.00], [-17.50, 14.70], [-15.00, 9.00],
          [-8.00, 5.00], [2.10, 6.30], [3.40, 6.45], [8.80, 4.00],
          [9.00, 1.00], [12.00, -4.30], [13.00, -15.00], [14.00, -22.50],
          [18.40, -33.90],
        ],
      },
      properties: { name: "WACS (West Africa Cable System)", length_km: 14530, landing_points: "UK, Portugal, Canary Islands, Senegal, Ghana, Nigeria, Cameroon, Congo, Angola, Namibia, South Africa", rfs_year: 2012, owners: "WACS Consortium (MTN / Vodacom / Togo Telecom + more)", capacity: "14.5 Tbps", status: "active" },
    },
  ],
};

export async function GET() {
  return NextResponse.json(CABLES_DATA);
}
