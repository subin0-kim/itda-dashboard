# Data Validation Report

- OK: `public/data/seoul_districts.geojson`
- OK: `public/data/grid_scores.geojson`
- OK: `public/data/district_scores.json`
- OK: `public/data/facilities.geojson`
- OK: `public/data/category_summary.json`
- OK: `public/data/benchmark_recommendations.json`
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

## Facility Category Counts
- education: 9596
- leisure: 1378
- medical: 866
- administration: 440

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

## Living Weight Summary
- aggregation_method: simple_average
- living_weight_status: unavailable
- living_weight: null=10028, zero=0, out_of_range=0
- park facility(leisure 도착지) count: 132
