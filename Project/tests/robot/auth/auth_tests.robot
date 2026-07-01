*** Settings ***
Documentation    Authentication and JWT security tests for SrijanSetu API.
Resource         ../resources/common.resource
Resource         ../resources/auth.resource
Suite Setup      Start API Session
Suite Teardown   Stop API Session

*** Test Cases ***
Customer Signup Success
    ${email}=    Generate Unique Email    auth.customer
    Set Suite Variable    ${AUTH_CUSTOMER_EMAIL}    ${email}
    ${response}=    Signup User    ${email}    ${CUSTOMER_PASSWORD}    CUSTOMER    Auth Customer
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    access_token
    Dictionary Should Contain Key    ${body["data"]}    refresh_token
    Should Be Equal    ${body["data"]["user"]["role"]}    CUSTOMER

Creator Signup Success
    ${email}=    Generate Unique Email    auth.creator
    Set Suite Variable    ${AUTH_CREATOR_EMAIL}    ${email}
    ${response}=    Signup User    ${email}    ${CREATOR_PASSWORD}    CREATOR    Auth Creator
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["user"]["role"]}    CREATOR

Duplicate Email Signup Failure
    ${response}=    Signup User    ${AUTH_CUSTOMER_EMAIL}    ${CUSTOMER_PASSWORD}    CUSTOMER    Duplicate Customer
    Response Should Be Error    ${response}    400

Login Success
    ${response}=    Login User    ${AUTH_CUSTOMER_EMAIL}    ${CUSTOMER_PASSWORD}
    ${body}=    Response Should Be Success    ${response}
    Should Not Be Empty    ${body["data"]["access_token"]}
    Should Not Be Empty    ${body["data"]["refresh_token"]}
    Set Suite Variable    ${AUTH_ACCESS_TOKEN}    ${body["data"]["access_token"]}
    Set Suite Variable    ${AUTH_REFRESH_TOKEN}    ${body["data"]["refresh_token"]}

Login Invalid Password
    ${response}=    Login User    ${AUTH_CUSTOMER_EMAIL}    WrongPassword123!
    Response Should Be Error    ${response}    401

Access Protected Route Without Token
    ${response}=    GET API    ${API_PREFIX}/auth/me
    Response Should Be Error    ${response}    401

Access Protected Route With Invalid Token
    ${response}=    GET API    ${API_PREFIX}/auth/me    invalid.jwt.token
    Response Should Be Error    ${response}    401

Refresh Token Success
    ${response}=    Refresh Access Token    ${AUTH_REFRESH_TOKEN}
    ${body}=    Response Should Be Success    ${response}
    Should Not Be Empty    ${body["data"]["access_token"]}

Auth Me Returns Current User
    ${response}=    Get Current User    ${AUTH_ACCESS_TOKEN}
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["user"]["email"]}    ${AUTH_CUSTOMER_EMAIL}
    Should Be Equal    ${body["data"]["user"]["role"]}    CUSTOMER

Logout Success
    ${response}=    Logout With Refresh Token    ${AUTH_ACCESS_TOKEN}    ${AUTH_REFRESH_TOKEN}
    Response Should Be Success    ${response}

