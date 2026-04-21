create sequence wards_id_seq;

create table wards (
    id bigint primary key default nextval('wards_id_seq'),
    name varchar(255)
);

create sequence users_id_seq;

create table users (
    id bigint primary key default nextval('users_id_seq'),
    email varchar(255) unique not null,
    password_hash varchar(255)
);

create sequence user_roles_id_seq;

create table user_roles (
    id bigint primary key default nextval('user_roles_id_seq'),
    user_id bigint not null,
    role varchar(50) not null,
    ward_id bigint
);

create sequence districts_id_seq;

create table districts (
    id bigint primary key default nextval('districts_id_seq'),
    name varchar(255) not null,
    leader bigint,
    assistant bigint,
    color varchar(50),
    ward_id bigint
);

create sequence members_id_seq;

create table members (
    id bigint primary key default nextval('members_id_seq'),
    ward_id bigint,
    family_name varchar(255) not null,
    formatted_address varchar(255) not null,
    name varchar(255) unique not null,
    address1 varchar(255),
    address2 varchar(255),
    city varchar(255),
    state varchar(20),
    postal_code varchar(20),
    phone varchar(20),
    notes text,
    lat double precision,
    lng double precision,
    district_id bigint
);

alter table districts add constraint districts_leader_fk foreign key (leader) references members (id);
alter table districts add constraint districts_assistant_fk foreign key (assistant) references members (id);
alter table districts add constraint districts_ward_fk foreign key (ward_id) references wards (id);
alter table members add constraint members_district_fk foreign key (district_id) references districts (id);
alter table members add constraint members_ward_fk foreign key (ward_id) references wards (id);
alter table users add constraint users_ward_fk foreign key (ward_id) references wards (id);

alter table user_roles foreign key (user_id) references users(id);
alter table user_roles foreign key (ward_id) references wards(id);