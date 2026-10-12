-- Ties a login to the member record of the same person, so being a district's
-- leader or assistant (which are members) can carry permissions for the user.
alter table users add column member_id bigint;
alter table users add constraint users_member_fk foreign key (member_id) references members (id);
