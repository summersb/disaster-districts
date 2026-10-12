-- The ward's leader is one of its members (shown on the ward dashboard).
alter table wards add column leader bigint;
alter table wards add constraint wards_leader_fk foreign key (leader) references members (id);
