-- The district_admin role is gone (district leaders replaced it). Anyone who
-- held it becomes an ordinary ward member: drop the row when they have another
-- role as well, otherwise turn it into `user` so they keep their ward.
delete from user_roles r
where r.role = 'district_admin'
  and exists (
      select 1 from user_roles o
      where o.user_id = r.user_id and o.id <> r.id and o.role <> 'district_admin'
  );
update user_roles set role = 'user' where role = 'district_admin';
