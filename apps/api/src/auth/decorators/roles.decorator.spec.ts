import { ROLES_KEY, Roles } from './roles.decorator';
import { USER_ROLES } from '../../contexts/auth/domain/auth.role';

describe('Roles decorator', () => {
  it('sets correct metadata with a single role', () => {
    @Roles(USER_ROLES.ADMIN)
    class TestClass {}

    const metadata = Reflect.getMetadata(ROLES_KEY, TestClass);
    expect(metadata).toEqual([USER_ROLES.ADMIN]);
  });

  it('sets correct metadata with multiple roles', () => {
    @Roles(USER_ROLES.USER, USER_ROLES.ADMIN)
    class TestClass {}

    const metadata = Reflect.getMetadata(ROLES_KEY, TestClass);
    expect(metadata).toEqual([USER_ROLES.USER, USER_ROLES.ADMIN]);
  });
});
