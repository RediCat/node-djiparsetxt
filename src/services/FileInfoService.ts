import { ServiceTypes } from "../common/ServiceManager";
import BaseService from "./BaseService";
import {
	BinaryParserService,
	ParserTypes,
} from "./BinaryParserService";
import { Version } from "../common/Version";
import { FileParsingService, IRecordStats } from "./FileParsingService";
import { RecordTypes } from "./RecordTypes";

export interface IHeaderInfo {
	file_size: number;
	header_size: number;
	records_size: number;
	details_size: number;
	version: Version;
}

export interface IFileInfo {
	header_info: IHeaderInfo;
	records_info: IRecordStats;
}

export interface IRecord {
	type: RecordTypes;
	length: number;
	data: Buffer[];
}

const newHeaderSize = 100;
const oldHeaderSize = 12;

export class FileInfoService extends BaseService {

	public name: string = "file_info";

	public get_header_info(buffer: Buffer): IHeaderInfo {
		const parserService = this.serviceMan.get_service(
			ServiceTypes.Parsers,
		) as BinaryParserService;
		const headerParser = parserService.get_parser(ParserTypes.Header);

		// get first 100 bytes and parse them.
		const header = headerParser.parse(buffer);
		let headerSize;
		if (header.file_version.ver[2] < 6) {
			headerSize = oldHeaderSize;
		} else {
			headerSize = newHeaderSize;
		}

		// calculate details
		const fileSize = buffer.length;
		const headerRecordsAreaSize = header.header_record_size_lo;
		const recordsAreaSize = headerRecordsAreaSize - headerSize;
		const detailsAreaSize = fileSize - headerRecordsAreaSize;

		// create version string
		const version = header.file_version;
		return {
			file_size: fileSize,
			header_size: headerSize,
			records_size: recordsAreaSize,
			details_size: detailsAreaSize,
			version,
		};
	}

	public get_records_info(buffer: Buffer): IRecordStats {
		const fileParsingService = this.serviceMan.get_service(
			ServiceTypes.FileParsing,
		) as FileParsingService;

		return fileParsingService.parse_records(buffer).stats;
	}

	public get_file_info(buffer: Buffer): IFileInfo {
		const fileParsingService = this.serviceMan.get_service(
			ServiceTypes.FileParsing,
		) as FileParsingService;
		const headerInfo = this.get_header_info(buffer);
		const recordStats = fileParsingService.parse_records(buffer, headerInfo)
			.stats;
		return { header_info: headerInfo, records_info: recordStats };
	}

	public get_details(buffer: Buffer): any {
		const headerInfo = this.get_header_info(buffer);
		const detailsStart = headerInfo.header_size + headerInfo.records_size;
		const detailsBuf = buffer.slice(detailsStart);
		const parserService = this.serviceMan.get_service(
			ServiceTypes.Parsers,
		) as BinaryParserService;
		const detailsParser = parserService.get_parser(ParserTypes.Details);
		const details = detailsParser.parse(detailsBuf);
		return details;
	}
}
