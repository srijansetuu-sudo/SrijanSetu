*** Settings ***
Documentation    Creator profile and saved creator API tests.
Resource         ../resources/common.resource
Resource         ../resources/auth.resource
Resource         ../resources/creators.resource
Suite Setup      Setup Creator Suite
Suite Teardown   Stop API Session

*** Keywords ***
Setup Creator Suite
    Start API Session
    Login As Customer
    Login As Creator

*** Test Cases ***
Creator Profile Creation
    ${response}=    Create Or Update Creator Profile    ${CREATOR_TOKEN}    Robot Creator Studio
    ${body}=    Response Should Be Success    ${response}
    Should Be UUID    ${body["data"]["creator"]["id"]}

Creator Profile Update
    ${response}=    Create Or Update Creator Profile    ${CREATOR_TOKEN}    Robot Creator Studio Updated
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["creator"]["brand_name"]}    Robot Creator Studio Updated

List Creators
    ${response}=    List Creators
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    items

Get Creator Profile
    ${response}=    Get Creator Profile    ${CREATOR_PROFILE_ID}
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["creator"]["id"]}    ${CREATOR_PROFILE_ID}

Customer Save Creator
    ${response}=    Save Creator    ${CUSTOMER_TOKEN}    ${CREATOR_PROFILE_ID}
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["saved_creator"]["creator_id"]}    ${CREATOR_PROFILE_USER_ID}

Customer Remove Saved Creator
    ${response}=    Remove Saved Creator    ${CUSTOMER_TOKEN}    ${CREATOR_PROFILE_USER_ID}
    Response Should Be Success    ${response}

Creator Cannot Save Creator
    ${response}=    Save Creator    ${CREATOR_TOKEN}    ${CREATOR_PROFILE_ID}
    Response Should Be Error    ${response}    403

Unauthorized Save Creator Failure
    ${response}=    POST API    ${API_PREFIX}/creators/${CREATOR_PROFILE_ID}/save
    Response Should Be Error    ${response}    401

