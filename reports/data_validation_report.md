# Data Validation Report

- OK: `public/data/seoul_districts.geojson`
- OK: `public/data/grid_scores.geojson`
- OK: `public/data/district_scores.json`
- OK: `public/data/facilities.geojson`
- OK: `public/data/category_summary.json`
- OK: `public/data/metadata.json`
- grid_scores geometry invalid=0, empty=0
- seoul_districts geometry invalid=0, empty=0
- facilities geometry invalid=0, empty=0
- score `pediatric_score`: null=0, out_of_range=0
- score `family_medicine_score`: null=0, out_of_range=0
- score `general_hospital_score`: null=0, out_of_range=0
- score `community_center_score`: null=0, out_of_range=0
- score `district_office_score`: null=0, out_of_range=0
- score `city_hall_score`: null=0, out_of_range=0
- score `childcare_center_score`: null=0, out_of_range=0
- score `kindergarten_score`: null=0, out_of_range=0
- score `park_score`: null=0, out_of_range=0
- score `library_culture_score`: null=0, out_of_range=0
- score `large_retail_score`: null=10028, out_of_range=0
- score `medical_score`: null=0, out_of_range=0
- score `admin_score`: null=0, out_of_range=0
- score `education_score`: null=0, out_of_range=0
- score `leisure_score`: null=0, out_of_range=0
- score `grid_stroller_score`: null=0, out_of_range=0
- score `stroller_score`: null=0, out_of_range=0
- score `weighted_stroller_score`: null=0, out_of_range=0
- score `weighted_grid_stroller_score`: null=0, out_of_range=0
- score `weighted_medical_score`: null=0, out_of_range=0
- score `weighted_admin_score`: null=0, out_of_range=0
- score `weighted_education_score`: null=0, out_of_range=0
- score `weighted_leisure_score`: null=0, out_of_range=0
- score `weighted_overall_score`: null=0, out_of_range=0

## Facility Category Counts
- education: 9596
- leisure: 1378
- medical: 835
- administration: 440

## Scoring Method Summary
- scoring_method: full_score_with_decay_after_800m
- full_score_distance_m: 800.0
- zero_score_distance_m: 1600.0
- distance_method: mixed
- pedestrian_network_status: partial

## Null Distance Summary
- dist_pediatric_clinic: 0
- dist_family_medicine: 0
- dist_general_hospital: 0
- dist_community_center: 0
- dist_district_office: 0
- dist_city_hall: 0
- dist_childcare_center: 0
- dist_kindergarten: 0
- dist_park: 0
- dist_library_culture: 0
- dist_large_retail_optional: 10028
- dist_pediatric_clinic_network: 6056
- dist_family_medicine_network: 6570
- dist_general_hospital_network: 7195
- dist_community_center_network: 6099
- dist_district_office_network: 7595
- dist_city_hall_network: 9319
- dist_childcare_center_network: 4463
- dist_kindergarten_network: 5908
- dist_park_network: 7014
- dist_library_culture_network: 5842

## Distance Method Summary
- dist_pediatric_clinic_method: {'euclidean_fallback': 6056, 'pedestrian_network': 3972}
- dist_family_medicine_method: {'euclidean_fallback': 6570, 'pedestrian_network': 3458}
- dist_general_hospital_method: {'euclidean_fallback': 7195, 'pedestrian_network': 2833}
- dist_community_center_method: {'euclidean_fallback': 6099, 'pedestrian_network': 3929}
- dist_district_office_method: {'euclidean_fallback': 7595, 'pedestrian_network': 2433}
- dist_city_hall_method: {'euclidean_fallback': 9319, 'pedestrian_network': 709}
- dist_childcare_center_method: {'pedestrian_network': 5565, 'euclidean_fallback': 4463}
- dist_kindergarten_method: {'euclidean_fallback': 5908, 'pedestrian_network': 4120}
- dist_park_method: {'euclidean_fallback': 7014, 'pedestrian_network': 3014}
- dist_library_culture_method: {'euclidean_fallback': 5842, 'pedestrian_network': 4186}
- dist_large_retail_optional_method: {'unavailable': 10028}

## Living Weight Summary
- aggregation_method: living_weighted_average
- living_weight_status: applied
- living_weight: null=0, zero=3107, low_under_0.05=0, valid=10028, low_or_zero_ratio=0.309832, out_of_range=0
- park_area_ratio > 0 grid count: 4911
- green_area_ratio > 0 grid count: 5482
- river_area_ratio > 0 grid count: 0
- forest_mountain_area_ratio > 0 grid count: 0
- park facility(leisure 도착지) count: 132
