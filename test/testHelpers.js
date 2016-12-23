/* eslint-disable */
var rewire = require('rewire');
var chai = require('chai');
var expect = chai.expect;
var helpers = rewire('../src/helpers');
var TooLongError = require('../src/TooLongError');
var expected;

describe('convertTime()', function() {
    before(function() {
        convertTime = helpers.__get__('convertTime');
    });

    it('should convert a time with only less than 10 seconds', function() {
        expected = '0:01';
        expect(convertTime('PT1S')).to.equal(expected);
    });

    it('should convert a time with only more than 9 seconds', function() {
        expected = '0:10';
        expect(convertTime('PT10S')).to.equal(expected);
    });

    it('should convert a time with only less than 10 minutes', function() {
        expected = '1:00';
        expect(convertTime('PT1M')).to.equal(expected);
    });

    it('should convert a time with only more than 9 minutes', function() {
        expected = '15:00';
        expect(convertTime('PT15M')).to.equal(expected);
    });

    it('should convert a time with less than 10 minutes and less than 10 seconds', function() {
        expected = '1:06';
        expect(convertTime('PT1M6S')).to.equal(expected);
    });

    it('should convert a time with less than 10 minutes and more than 9 seconds', function() {
        expected = '5:23';
        expect(convertTime('PT5M23S')).to.equal(expected);
    });

    it('should convert a time with more than 9 minutes and less than 10 seconds', function() {
        expected = '11:05';
        expect(convertTime('PT11M5S')).to.equal(expected);
    });

    it('should convert a time with more than 9 minutes and more than 9 seconds', function() {
        expected = '15:30';
        expect(convertTime('PT15M30S')).to.equal(expected);
    });

    it('should convert a time with only less than 10 hours', function() {
        expected = '5:00:00';
        expect(convertTime('PT5H')).to.equal(expected);
    });

    it('should convert a time with only more than 9 hours', function() {
        expected = '11:00:00';
        expect(convertTime('PT11H')).to.equal(expected);
    });

    it('should convert a time with less than 10 hours and less than 10 seconds', function() {
        expected = '5:00:09';
        expect(convertTime('PT5H9S')).to.equal(expected);
    });

    it('should convert a time with less than 10 hours and more than 9 seconds', function() {
        expected = '7:00:30';
        expect(convertTime('PT7H30S')).to.equal(expected);
    });

    it('should convert a time with more than 9 hours and less than 10 seconds', function() {
        expected = '23:00:05';
        expect(convertTime('PT23H5S')).to.equal(expected);
    });

    it('should convert a time with more than 9 hours and more than 9 seconds', function() {
        expected = '16:00:32';
        expect(convertTime('PT16H32S')).to.equal(expected);
    });

    it('should convert a time with less than 10 hours and less than 10 minutes', function() {
        expected = '7:05:00';
        expect(convertTime('PT7H5M')).to.equal(expected);
    });

    it('should convert a time with less than 10 hours and more than 9 minutes', function() {
        expected = '9:11:00';
        expect(convertTime('PT9H11M')).to.equal(expected);
    });

    it('should convert a time with more than 9 hours and less than 10 minutes', function() {
        expected = '16:05:00';
        expect(convertTime('PT16H5M')).to.equal(expected);
    });

    it('should convert a time with more than 9 hours and more than 9 minutes', function() {
        expected = '13:23:00';
        expect(convertTime('PT13H23M')).to.equal(expected);
    });

    it('should convert a time with less than 10 hours, less than 10 minutes, and less than 10 seconds', function() {
        expected = '5:09:02';
        expect(convertTime('PT5H9M2S')).to.equal(expected);
    });

    it('should convert a time with less than 10 hours, less than 10 minutes, and more than 9 seconds', function() {
        expected = '7:02:15';
        expect(convertTime('PT7H2M15S')).to.equal(expected);
    });

    it('should convert a time with less than 10 hours, more than 9 minutes, and less than 10 seconds', function() {
        expected = '2:36:08';
        expect(convertTime('PT2H36M8S')).to.equal(expected);
    });

    it('should convert a time with less than 10 hours, more than 9 minutes, and more than 9 seconds', function() {
        expected = '9:15:42';
        expect(convertTime('PT9H15M42S')).to.equal(expected);
    });

    it('should convert a time with more than 9 hours, less than 10 minutes, and less than 10 seconds', function() {
        expected = '15:03:05';
        expect(convertTime('PT15H3M5S')).to.equal(expected);
    });

    it('should convert a time with more than 9 hours, less than 10 minutes, and more than 9 seconds', function() {
        expected = '20:05:33';
        expect(convertTime('PT20H5M33S')).to.equal(expected);
    });

    it('should convert a time with more than 9 hours, more than 9 minutes, and less than 10 seconds', function() {
        expected = '15:43:01';
        expect(convertTime('PT15H43M1S')).to.equal(expected);
    });

    it('should convert a time with more than 9 hours, more than 9 minutes, and more than 9 seconds', function() {
        expected = '23:22:21';
        expect(convertTime('PT23H22M21S')).to.equal(expected);
    });

    it('should throw a TooLongError if the time has a year in it', function() {
        expect(function() {
            convertTime('P1YT5H20M5S')
        }).to.throw(TooLongError);
    });

    it('should throw a TooLongError if the time has a month in it', function() {
        expect(function() {
            convertTime('P1MT2H1M20S')
        }).to.throw(TooLongError);
    });

    it('should throw a TooLongError if the time has a week in it', function() {
        expect(function() {
            convertTime('P1WT6H50M1S')
        }).to.throw(TooLongError);
    });

    it('should throw a TooLongError if the time has a day in it', function() {
        expect(function() {
            convertTime('P1DT5H20M15S')
        }).to.throw(TooLongError);
    });

    it('should throw a TooLongError if the time has a year, month, week, and day in it', function() {
        expect(function() {
            convertTime('P1Y2M3W4DT5H9M6S')
        }).to.throw(TooLongError);
    });
});
