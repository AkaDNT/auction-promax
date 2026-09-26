package com.auctionpromax.identityprofileservice.ports.out.sample;

public interface SamplePayloadSerializerPort {

  String serializeEvent(SampleRecordedEventData event);

  String serializeResponse(StoredSampleResponseData response);
}
