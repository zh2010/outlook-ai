import datetime
import os
import shutil
import time
import datetime as dt
from datetime import timedelta
from typing import Optional

from fastapi import Request, BackgroundTasks
from fastapi.responses import RedirectResponse
import requests

from server.common.utils.auth import create_token
from server.common.utils.funcs import parse_duration
from server.configs.base import EXPIRES_TIME
from server.configs.sso import SSOConfig as sso
from server.models.record import AccessRecord, AccessRecordModel


async def sso_login(request: Request, background_tasks: BackgroundTasks, code: Optional[str]=None):
    """sso 登陆验证
    :param: code: 信息验证code
    """
    # print("sso login")
    # return "success"
    state = int(time.time()*1000)
    if not code or code == -1:
        print(f"测试登陆：{code}")
        # 1. 跳转auth2, 获取code
        redirect_uri = sso.OAUTH2.format(
            client_id=sso.CLIENT_ID,
            redirect_uri=sso.REDIRECT_URI,
            state=state)
        return RedirectResponse(redirect_uri)
    data = {
        'code': code,
        'grant_type': sso.GRANT_TYPE,
        'client_id': sso.CLIENT_ID,
        'client_secret': sso.CLIENT_SECRET,
        'redirect_uri': sso.REDIRECT_URI
    }
    # 2-携带code 访问SSO 获取AccessToken
    token_resp = requests.post(url=sso.TOKEN_URL, data=data)
    if token_resp.status_code != 200:
        return None, "code invalid"
    access_token = token_resp.json().get('access_token', "")
    # 3-携带token 访问SSO 获取用户信息
    user_resp = requests.get(sso.USER_INFO_URL, params={"access_token":access_token})
    if user_resp.status_code != 200:
        return None, "access_token invalid"
    print(user_resp.json())
    empid = user_resp.json().get('id')
    user_name = user_resp.json().get('name')
    # 不限制人员  sso控制能访问的人员
    expires_delta = timedelta(hours=EXPIRES_TIME)
    expires_at = None
    if expires_delta:
        expires_at = int(time.time()) + int(expires_delta.total_seconds())
    datetime_expires_at = (
        datetime.datetime.fromtimestamp(expires_at, datetime.timezone.utc)
        if expires_at
        else None
    )
    access_token_jwt = create_token(
        identity=empid, 
        additional_claims={
            "code": empid,
            "name": user_name
        },
        expires_delta=timedelta(hours=EXPIRES_TIME))
    # 4-携带用户信息 重新访问主页
    response = RedirectResponse(sso.CLIENT_URI, 302)
    response.set_cookie(
        key='token', 
        value=access_token_jwt,
        expires=datetime_expires_at,
        domain='.hspharm.com', 
        secure=False, 
        httponly=False)
    record_data = AccessRecordModel(
        empid=int(empid),
        access_time=dt.datetime.now(),
        base_url="/icf/sso/login",
        req_data={
            'code': data["code"],
            'grant_type': data["grant_type"],
            'oauth_timestamp': state
        },
        remark="SSO登陆",
        name=user_name,
        ip=request.client.host,
    ).model_dump()
    background_tasks.add_task(AccessRecord.insert_one, record_data)
    return response


def delete_user_tmp(empid):
    """删除用户临时文件夹"""
    base_path = os.getcwd() + "/tmp/"
    user_path = os.path.join(base_path, empid)
    if os.path.exists(user_path):
        shutil.rmtree(user_path)


def logout(empid, jti):
    """注销登陆"""
    # 可以不存到mysql
    # lg_obj = LogoutJti.query.filter_by(empid=empid).first()
    # if not lg_obj:
    #     LogoutJti.objects.create(empid=empid, jti=jti)
    # else:
    #     lg_obj.update(jti=jti)
    # key = MODEL_KEY % (LogoutJti.__tablename__, str(empid))
    # redis_c.set(key, lg_obj)
    return True

