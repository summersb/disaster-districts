-- Seed 10 sample users. Password for every account is 'password123'.
-- Hash generated with at.favre.lib.crypto.bcrypt at cost 12 (matches AuthResource/UsersResource).

insert into wards (name, lat, lng)
values ('Sample Ward', 40.7128, -74.0060);

with sample_ward as (
    select id from wards where name = 'Sample Ward'
), inserted_users as (
    insert into users (email, password_hash)
    values
        ('admin@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i'),
        ('user1@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i'),
        ('user2@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i'),
        ('user3@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i'),
        ('user4@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i'),
        ('user5@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i'),
        ('user6@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i'),
        ('user7@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i'),
        ('user8@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i'),
        ('user9@example.com',  '$2a$12$foelRpJIETk3kfBvYeZB2OlCl2WZ7znQP1MbKR3w2/UrHluAN4I8i')
    returning id, email
)
insert into user_roles (user_id, role, ward_id)
select
    iu.id,
    case when iu.email = 'admin@example.com' then 'admin' else 'user' end,
    case when iu.email = 'admin@example.com' then null else (select id from sample_ward) end
from inserted_users iu;

-- 20 sample members scattered within ~1km of Sample Ward (40.7128, -74.0060).
-- Offsets are roughly +/- 0.009 deg lat (~1km) and +/- 0.012 deg lng (~1km at this latitude).
insert into members (ward_id, family_name, formatted_address, name, address1, city, state, postal_code, phone, lat, lng)
select
    (select id from wards where name = 'Sample Ward'),
    family_name,
    address1 || ', ' || city || ', ' || state || ' ' || postal_code,
    family_name || ', ' || given_name,
    address1,
    city,
    state,
    postal_code,
    phone,
    lat,
    lng
from (values
    ('Anderson', 'James',    '101 Maple St',     'New York', 'NY', '10001', '212-555-0101', 40.7195, -74.0012),
    ('Brown',    'Mary',     '202 Oak Ave',      'New York', 'NY', '10001', '212-555-0102', 40.7081, -74.0143),
    ('Clark',    'Robert',   '303 Pine Rd',      'New York', 'NY', '10001', '212-555-0103', 40.7156, -73.9988),
    ('Davis',    'Patricia', '404 Cedar Ln',     'New York', 'NY', '10001', '212-555-0104', 40.7102, -74.0121),
    ('Evans',    'John',     '505 Birch Blvd',   'New York', 'NY', '10001', '212-555-0105', 40.7184, -74.0058),
    ('Fisher',   'Jennifer', '606 Elm Ct',       'New York', 'NY', '10001', '212-555-0106', 40.7065, -74.0019),
    ('Garcia',   'Michael',  '707 Walnut Way',   'New York', 'NY', '10001', '212-555-0107', 40.7211, -74.0095),
    ('Harris',   'Linda',    '808 Chestnut Dr',  'New York', 'NY', '10001', '212-555-0108', 40.7094, -74.0163),
    ('Iverson',  'David',    '909 Spruce St',    'New York', 'NY', '10001', '212-555-0109', 40.7172, -74.0041),
    ('Johnson',  'Barbara',  '110 Aspen Ave',    'New York', 'NY', '10001', '212-555-0110', 40.7118, -74.0078),
    ('King',     'William',  '121 Hickory Pl',   'New York', 'NY', '10001', '212-555-0111', 40.7203, -74.0134),
    ('Lopez',    'Susan',    '132 Sycamore Rd',  'New York', 'NY', '10001', '212-555-0112', 40.7076, -74.0007),
    ('Miller',   'Richard',  '143 Magnolia Dr',  'New York', 'NY', '10001', '212-555-0113', 40.7149, -74.0156),
    ('Nguyen',   'Karen',    '154 Dogwood Ln',   'New York', 'NY', '10001', '212-555-0114', 40.7088, -74.0049),
    ('Olsen',    'Joseph',   '165 Willow Ct',    'New York', 'NY', '10001', '212-555-0115', 40.7167, -74.0114),
    ('Parker',   'Nancy',    '176 Poplar St',    'New York', 'NY', '10001', '212-555-0116', 40.7129, -73.9994),
    ('Quinn',    'Thomas',   '187 Redwood Way',  'New York', 'NY', '10001', '212-555-0117', 40.7058, -74.0086),
    ('Roberts',  'Lisa',     '198 Cypress Ave',  'New York', 'NY', '10001', '212-555-0118', 40.7191, -74.0027),
    ('Smith',    'Charles',  '209 Sequoia Rd',   'New York', 'NY', '10001', '212-555-0119', 40.7142, -74.0148),
    ('Turner',   'Betty',    '220 Cottonwood Dr','New York', 'NY', '10001', '212-555-0120', 40.7106, -74.0063)
) as m(family_name, given_name, address1, city, state, postal_code, phone, lat, lng);

-- Two sample districts in Sample Ward, with leader/assistant assigned from the seeded members.
-- Color names match the ColorPicker options and the SVG filenames in
-- frontend/public/images (e.g. /images/Blue.svg, /images/Red.svg).
insert into districts (name, ward_id, color, lat, lng, leader, assistant)
select
    'North District',
    (select id from wards where name = 'Sample Ward'),
    'Blue',
    40.7180,
    -74.0060,
    (select id from members where name = 'Anderson, James'),
    (select id from members where name = 'Evans, John');

insert into districts (name, ward_id, color, lat, lng, leader, assistant)
select
    'South District',
    (select id from wards where name = 'Sample Ward'),
    'Red',
    40.7080,
    -74.0060,
    (select id from members where name = 'Brown, Mary'),
    (select id from members where name = 'Fisher, Jennifer');

-- Assign roughly half the members to each district based on latitude (north vs south of ward center).
update members
set district_id = (select id from districts where name = 'North District')
where ward_id = (select id from wards where name = 'Sample Ward')
  and lat >= 40.7128
  and district_id is null;

update members
set district_id = (select id from districts where name = 'South District')
where ward_id = (select id from wards where name = 'Sample Ward')
  and lat < 40.7128
  and district_id is null;
