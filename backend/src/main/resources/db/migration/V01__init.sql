create sequence wards_id_seq;

create table wards (
    id bigint primary key default nextval('wards_id_seq'),
    name varchar(255),
    lat double precision,
    lng double precision
);

create sequence users_id_seq;

create table users (
    id bigint primary key default nextval('users_id_seq'),
    email varchar(255) unique not null,
    password_hash varchar(255),
    name varchar(255)
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
    ward_id bigint,
    lat double precision,
    lng double precision
);

create sequence members_id_seq;

create table members (
    id bigint primary key default nextval('members_id_seq'),
    ward_id bigint,
    family_name varchar(255) not null,
    formatted_address varchar(255) not null,
    name varchar(255) not null,
    address1 varchar(255),
    address2 varchar(255),
    city varchar(255),
    state varchar(20),
    postal_code varchar(20),
    phone varchar(20),
    notes text,
    lat double precision,
    lng double precision,
    district_id bigint,
    -- Uniqueness is per-ward and per-person (family name + given name), matching
    -- MembersResource's application-level conflict check.
    constraint members_ward_family_name_key unique (ward_id, family_name, name)
);

CREATE SEQUENCE ward_join_requests_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE ward_join_requests (
                                    id          BIGINT PRIMARY KEY DEFAULT nextval('ward_join_requests_id_seq'),
                                    user_id     BIGINT NOT NULL,
                                    ward_id     BIGINT NOT NULL,
                                    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                                    message     TEXT,
                                    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                    resolved_by BIGINT,
                                    resolved_at TIMESTAMP,
                                    assigned_role VARCHAR(50)
);

ALTER TABLE ward_join_requests ADD CONSTRAINT fk_wjr_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE ward_join_requests ADD CONSTRAINT fk_wjr_ward FOREIGN KEY (ward_id) REFERENCES wards(id);
ALTER TABLE ward_join_requests ADD CONSTRAINT fk_wjr_resolver FOREIGN KEY (resolved_by) REFERENCES users(id);

alter table districts add constraint districts_leader_fk foreign key (leader) references members (id);
alter table districts add constraint districts_assistant_fk foreign key (assistant) references members (id);
alter table districts add constraint districts_ward_fk foreign key (ward_id) references wards (id);
alter table members add constraint members_district_fk foreign key (district_id) references districts (id);
alter table members add constraint members_ward_fk foreign key (ward_id) references wards (id);

alter table user_roles add constraint users_role_users_fk foreign key (user_id) references users(id);
alter table user_roles add constraint users_role_wards_fk foreign key (ward_id) references wards(id);