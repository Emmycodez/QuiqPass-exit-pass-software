INSERT INTO room (hostel_id, name, capacity)
SELECT
  h.id,
  'Room ' || n,
  4
FROM hostel h
CROSS JOIN generate_series(1, 100) AS n;
