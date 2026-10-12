-- One login can belong to several wards, and so can stand for a member record
-- in each of them. Replace the single users.member_id with a link table.
create table user_members (
    user_id bigint not null,
    member_id bigint not null,
    primary key (user_id, member_id),
    constraint user_members_user_fk foreign key (user_id) references users (id),
    constraint user_members_member_fk foreign key (member_id) references members (id)
);

insert into user_members (user_id, member_id)
select id, member_id from users where member_id is not null;

alter table users drop constraint users_member_fk;
alter table users drop column member_id;
