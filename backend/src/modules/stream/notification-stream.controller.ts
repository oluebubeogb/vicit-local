import { Controller, ForbiddenException, MessageEvent, Query, Sse } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationHub } from '../notifications/notification.hub';

/**
 * v31: GET /notifications/stream?token=… — live in-app notifications for the signed-in user
 * EventSource can't send headers, so the JWT comes in the query string.
 */
@ApiTags('Notifications')
@Controller('notifications')
export class NotificationStreamController {
  constructor(private jwt: JwtService, private auth: AuthService, private hub: NotificationHub) {}

  private async userFromToken(token?: string) {
    if (!token) throw new ForbiddenException('Sign in required');
    let payload: any;
    try { payload = this.jwt.verify(token); } catch { throw new ForbiddenException('Sign in required'); }
    const user = await this.auth.validateUser(payload.sub);
    if (!user || !user.isActive) throw new ForbiddenException('Sign in required');
    return { id: user.id };
  }

  @Sse('stream')
  stream(@Query('token') token?: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      let closed = false;
      let unsubscribe = () => {};
      let ping: NodeJS.Timeout | null = null;
      this.userFromToken(token)
        .then((user) => {
          if (closed) return;
          const send = (data: any) => subscriber.next({ data });
          send({ type: 'hello' });
          unsubscribe = this.hub.subscribe(user.id, send);
          ping = setInterval(() => send({ type: 'ping', t: Date.now() }), 25000);
        })
        .catch((err) => subscriber.error(err));
      return () => {
        closed = true;
        if (ping) clearInterval(ping);
        unsubscribe();
      };
    });
  }
}
